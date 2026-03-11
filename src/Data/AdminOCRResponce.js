import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../API/apiClient";
import { API_HOST, DOCUMENTHEADER_API, SYSTEM_ADMIN, BRANCH_ADMIN} from "../API/apiConfig";
import { EyeIcon, XMarkIcon, PrinterIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import AutoTranslate from '../i18n/AutoTranslate'; 
import FilePreviewModal from "../Components/FilePreviewModal";

const AdminOCRResponse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const responseData = location.state?.responseData;
  const [documents, setDocuments] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [, setPopupMessage] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [printTrue, setPrintTrue] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [, setSearchFileTerm] = useState("");

  const token = localStorage.getItem("tokenKey");

  useEffect(() => {
    console.log("=================================");
    console.log("🔍 AdminOCRResponse - Full Response Data:", responseData);
    console.log("matching_files:", responseData?.matching_files);
    console.log("=================================");
  }, [responseData]);

  const fetchDocuments = async () => {
    console.log("=================================");
    console.log("📥 fetchDocuments called");
    
    if (!responseData?.matching_files || responseData.matching_files.length === 0) {
      console.error("❌ No matching files found in the response data");
      return;
    }

    console.log("✅ matching_files length:", responseData.matching_files.length);

    try {
      const fetchedDocuments = new Map();

      for (const [index, item] of responseData.matching_files.entries()) {
        console.log(`\n--- Processing item ${index + 1} ---`);
        console.log("Item:", item);
        console.log("DocumentDetails ID:", item.mysql_original_id);
        console.log("File name:", item.file_name);

        try {
          // Use the DocumentDetails ID to get the DocumentHeader
          const detailsId = item.mysql_original_id;
          console.log(`🔍 Fetching document header using details ID: ${detailsId}`);
          console.log(`API URL: ${DOCUMENTHEADER_API}/findByDetailsId/${detailsId}`);
          
          const response = await apiClient.get(
            `${DOCUMENTHEADER_API}/findByDetailsId/${detailsId}`);

          console.log(`✅ Response for details ID ${detailsId}:`, response.data);
          
          // Extract the document header data
          const documentData = response.data.response || response.data;
          const headerId = documentData.id;
          
          console.log("Document Header ID:", headerId);
          console.log("Document Header Data:", documentData);

          if (fetchedDocuments.has(headerId)) {
            console.log(`📝 Document Header ID ${headerId} already exists`);
            const existingEntry = fetchedDocuments.get(headerId);
            
            // Store multiple file names for this header
            if (!existingEntry.fileDetails) {
              existingEntry.fileDetails = [];
            }
            
            existingEntry.fileDetails.push({
              detailsId: detailsId,
              fileName: item.file_name
            });
            
            // Update the fileNames string for display
            existingEntry.fileNames = existingEntry.fileDetails
              .map(fd => fd.fileName)
              .join(", ");
              
            console.log(`Updated fileDetails for Header ID ${headerId}:`, existingEntry.fileDetails);
          } else {
            console.log(`➕ Adding new document header with ID ${headerId}`);
            fetchedDocuments.set(headerId, { 
              headerId: headerId,
              fileDetails: [{
                detailsId: detailsId,
                fileName: item.file_name
              }],
              fileNames: item.file_name,
              data: documentData 
            });
            console.log(`Added document:`, fetchedDocuments.get(headerId));
          }
        } catch (err) {
          console.error(`❌ Failed to fetch document for details ID: ${item.mysql_original_id}`, err);
          console.error("Error message:", err.message);
          console.error("Error response:", err.response?.data);
        }
      }

      console.log("\n=================================");
      console.log("📊 Final fetchedDocuments Map size:", fetchedDocuments.size);
      
      const documentsArray = Array.from(fetchedDocuments.values());
      console.log("Documents array:", documentsArray);
      
      setDocuments(documentsArray);
    } catch (error) {
      console.error("❌ Fetch documents error:", error);
    }
  };

  const fetchPaths = async (doc) => {
    console.log("=================================");
    console.log("🛣️ fetchPaths called for document:", doc);
    
    try {
      if (!doc.data || !doc.data.id) {
        console.error("❌ Invalid document or missing header ID", doc);
        return null;
      }

      const headerId = doc.data.id;
      console.log("Fetching paths for Document Header ID:", headerId);
      console.log(`API URL: ${DOCUMENTHEADER_API}/byDocumentHeader/${headerId}`);
      
      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${headerId}/ALL`);

      console.log("✅ Paths response:", response.data);
      
      // Handle the response - it should be an array of DocumentDetails
      const allPaths = Array.isArray(response.data) ? response.data : [];
      console.log("All paths for this header:", allPaths);
      
      // Filter to only show the paths that match our file names from the search
      const matchedFileNames = doc.fileDetails ? 
        doc.fileDetails.map(fd => fd.fileName) : 
        doc.fileNames.split(",").map(name => name.trim());
      
      console.log("Matched file names to filter:", matchedFileNames);
      
      const filteredPaths = allPaths.filter(path => 
        matchedFileNames.includes(path.docName)
      );
      
      console.log("Filtered paths (only matched files):", filteredPaths);

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: filteredPaths,
        fileDetails: doc.fileDetails || [],
        fileNames: doc.fileNames
      }));

      return filteredPaths;
    } catch (error) {
      console.error("❌ Error in fetchPaths:", error);
      showPopup("Failed to fetch document paths", "error");
      return null;
    }
  };

  const handleback = () => {
    console.log("🔙 handleback called");
    const role = localStorage.getItem("role");
    
    if (role === "SYSTEM_ADMIN") {
      navigate("/adminOcr");
    } else if (role === "BRANCH_ADMIN") {
      navigate("/brAdminOcr");
    } else {
      navigate("/searchOcr");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [responseData]);

  const openFile = async (file) => {
    console.log("📂 openFile called with file:", file);
    
    try {
      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");

      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}?action=view`;

      const response = await apiClient.get(fileUrl, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      setIsModalOpen(true);
    } catch (error) {
      console.error("❌ Error in openFile:", error);
      showPopup("Failed to open file", "error");
    }
  };

  // const openModal = async (doc) => {
  //   console.log("🔓 openModal called with doc:", doc);
    
  //   if (!doc.data || !doc.data.id) {
  //     console.error("❌ Invalid document or missing header ID:", doc);
  //     alert("The selected document is invalid or missing required information.");
  //     return;
  //   }

  //   try {
  //     setSelectedDoc(doc);
  //     const filteredPaths = await fetchPaths(doc);

  //     if (filteredPaths && filteredPaths.length > 0) {
  //       console.log("✅ Paths fetched successfully, opening modal");
  //       setIsOpen(true);
  //     } else {
  //       console.warn("⚠️ No matching paths found for this document");
  //       alert("No matching files found for this document.");
  //     }
  //   } catch (error) {
  //     console.error("❌ Failed to fetch paths:", error);
  //     alert("Could not load the document. Please try again later.");
  //   }
  // };
  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
    fetchQRCode(doc.id);
  };

  const closeModal = () => {
    console.log("❌ closeModal called");
    setIsOpen(false);
    setSelectedDoc({ paths: [] });
  };

  useEffect(() => {
    if (selectedDoc && selectedDoc.data?.id) {
      fetchQRCode(selectedDoc.data.id);
    }
  }, [selectedDoc]);

const fetchQRCode = async (documentId) => {
  try {
    
    const apiUrl = `/api/documents/documents/download/qr/${documentId}`;

    const response = await apiClient.get(apiUrl, { responseType: "blob" });

    const qrCodeBlob = response.data;

    if (!qrCodeBlob.type.includes("image/png")) {
      throw new Error(<AutoTranslate>Received data is not a valid image</AutoTranslate>);
    }

    const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);
    setQrCodeUrl(qrCodeUrl);
  } catch (error) {
    setError(<AutoTranslate>Error displaying QR Code:</AutoTranslate> + error.message);
  }
};


  const downloadQRCode = async () => {
    if (!selectedDoc?.data?.id) {
      alert("No document selected");
      return;
    }

    try {
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.data.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.data.id}.png`;
      link.click();

      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      console.error("❌ Error downloading QR Code:", error);
    }
  };

  const handleDownload = async (file, action = "download") => {
    if (!selectedDoc || !selectedDoc.data) return;

    try {
      const branch = selectedDoc.data.employee?.branch?.name?.replace(/ /g, "_");
      const department = selectedDoc.data.employee?.department?.name?.replace(/ /g, "_");
      const year = file.year?.replace(/ /g, "_") || "unknown";
      const category = selectedDoc.data.categoryMaster?.name?.replace(/ /g, "_") || "unknown";
      const version = file.version;
      const fileName = file.docName?.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(branch)}/${encodeURIComponent(department)}/${encodeURIComponent(year)}/${encodeURIComponent(category)}/${encodeURIComponent(version)}/${encodeURIComponent(fileName)}?action=${action}`;

      const response = await apiClient.get(fileUrl, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      if (action === "view") {
        window.open(link.href, "_blank");
      } else {
        link.download = file.docName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("❌ Error in handleDownload:", error);
      showPopup("Failed to download file", "error");
    }
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const showPopup = (message, type = "info") => {
    console.log(`📢 Popup:`, message);
    setPopupMessage({ message, type });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4 font-semibold text-gray-800">Document Text Search (OCR)</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-4 w-full">
            <label className="text-md font-medium whitespace-nowrap">
              Your Search Query:
            </label>
            <input
              disabled
              value={responseData ? responseData.query || "" : ""}
              className="bg-slate-800 text-white p-2 rounded-lg flex-1 text-center cursor-not-allowed opacity-70"
            />
            <button
              onClick={handleback}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-300 no-print whitespace-nowrap"
            >
              Back to OCR Search
            </button>
          </div>
        </div>

        <h1 className="font-bold text-lg mb-4">Your Matching Documents</h1>
        
        {documents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No documents found. Please check the console for errors.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left">S.N.</th>
                  <th className="border p-2 text-left">Title</th>
                  <th className="border p-2 text-left">File No</th>
                  <th className="border p-2 text-left">Subject</th>
                  <th className="border p-2 text-left">Year</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Branch</th>
                  <th className="border p-2 text-left">Department</th>
                  <th className="border p-2 text-left">Uploaded By</th>
                  <th className="border p-2 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={doc.headerId || index} className="hover:bg-gray-50">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{doc.data?.title || "N/A"}</td>
                    <td className="border p-2">{doc.data?.fileNo || "N/A"}</td>
                    <td className="border p-2">{doc.data?.subject || "N/A"}</td>
                    <td className="border p-2">{doc.data?.yearMaster?.name || "N/A"}</td>
                    <td className="border p-2">{doc.data?.categoryMaster?.name || "N/A"}</td>
                    <td className="border p-2">{doc.data?.employee?.branch?.name || ""}</td>
                    <td className="border p-2">{doc.data?.employee?.department?.name || ""}</td>
                    <td className="border p-2">{doc.data?.employee?.name || ""}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => openModal(doc)}
                        className="hover:opacity-80 transition-opacity"
                        title="View Document"
                      >
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownload={handleDownload}
          fileType={contentType}
          fileUrl={blobUrl}
          fileName={selectedDocFile?.docName}
          fileData={selectedDocFile}
        />

        {/* Document Details Modal */}
        {isOpen && selectedDoc && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75 print-modal overflow-y-auto">
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl p-4 sm:p-6 my-8 mx-4">
              <div className="max-h-[80vh] overflow-y-auto">
                {/* Print Button */}
                <button
                  className="absolute top-4 right-16 text-gray-500 hover:text-gray-700 no-print"
                  onClick={printPage}
                >
                  <PrinterIcon className="h-6 w-6" />
                </button>

                {/* Close Button */}
                <button
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 no-print"
                  onClick={closeModal}
                >
                  <XMarkIcon className="h-6 w-6 text-black hover:text-white hover:bg-red-600 rounded-full p-1" />
                </button>

                {/* Modal Content */}
                <div className="flex flex-col h-full mt-8">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-center border-b-2 border-gray-300 pb-4">
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-extrabold text-indigo-600 border-b-4 border-indigo-600">D</p>
                      <p className="text-lg font-extrabold text-indigo-600 border-t-4 border-indigo-600">MS</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 sm:mt-0">
                      <strong>Uploaded Date:</strong> {formatDate(selectedDoc?.data?.createdOn)}
                    </p>
                  </div>

                  {/* Document Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="mt-6 text-left">
                      {[
                        { label: "Branch", value: selectedDoc?.data?.employee?.branch?.name },
                        { label: "Department", value: selectedDoc?.data?.employee?.department?.name },
                        { label: "File No.", value: selectedDoc?.data?.fileNo },
                        { label: "Title", value: selectedDoc?.data?.title },
                        { label: "Subject", value: selectedDoc?.data?.subject },
                        { label: "Category", value: selectedDoc?.data?.categoryMaster?.name || "No Category" },
                        { label: "File Year", value: selectedDoc?.data?.yearMaster?.name },
                        { label: "Status", value: selectedDoc?.data?.approvalStatus },
                        { label: "Upload By", value: selectedDoc?.data?.employee?.name },
                      ].map((item, idx) => (
                        <p key={idx} className="text-md text-gray-700">
                          <strong>{item.label} :-</strong> {item.value || "N/A"}
                        </p>
                      ))}
                    </div>
                    <div className="items-center justify-center text-center">
                      <p className="text-md text-gray-700 mt-3">
                        <strong>QR Code:</strong>
                      </p>
                      {qrCodeUrl ? (
                        <div className="mt-4">
                          <img
                            src={qrCodeUrl}
                            alt="QR Code"
                            className="mx-auto w-24 h-24 sm:w-32 sm:h-32 object-contain border border-gray-300 p-2"
                          />
                          <button
                            onClick={downloadQRCode}
                            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 no-print"
                          >
                            Download
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-500 mt-4">No QR code available</p>
                      )}
                    </div>
                  </div>

                  {/* Attached Files */}
                  <div className="mt-6 text-center">
                    <h2 className="text-lg font-semibold text-indigo-700">
                      Your Matched Files
                    </h2>
                    {Array.isArray(selectedDoc.paths) && selectedDoc.paths.length > 0 ? (
                      <>
                        <div className="flex justify-between mb-2 font-semibold text-sm text-gray-700 mt-5">
                          <h3 className="flex-1 text-left ml-2">File Name</h3>
                          <h3 className="flex-1 text-center">Version</h3>
                          <h3 className="text-right mr-10 no-print">Actions</h3>
                        </div>
                        <ul className="space-y-4">
                          {selectedDoc.paths.map((file, index) => (
                            <li
                              key={index}
                              className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:bg-indigo-50 transition duration-300"
                            >
                              <div className="flex-1 text-left">
                                <strong>{index + 1}</strong>{" "}
                                {file.docName.split("_").slice(1).join("_")}
                              </div>
                              <div className="flex-1 text-center">
                                <strong>{file.version}</strong>
                              </div>
                              <div className="flex justify-center no-print">
                                <button
                                  onClick={() => {
                                    setOpeningFileIndex(index);
                                    setSelectedDocFiles(file);
                                    openFile(file).finally(() => setOpeningFileIndex(null));
                                  }}
                                  disabled={openingFileIndex !== null}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
                                    ${openingFileIndex === index ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white`}
                                >
                                  {openingFileIndex === index ? (
                                    <>
                                      <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                      <AutoTranslate>
                                        {file.ltoArchived && !file.restored ? "Restoring..." : "Opening..."}
                                      </AutoTranslate>
                                    </>
                                  ) : (
                                    <>
                                      {file.ltoArchived && !file.restored ? (
                                        <ArrowPathIcon className="h-3 w-3" />
                                      ) : (
                                        <EyeIcon className="h-3 w-3" />
                                      )}
                                      <AutoTranslate>
                                        {file.ltoArchived && !file.restored ? "Restore" : "View"}
                                      </AutoTranslate>
                                    </>
                                  )}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">
                        No attached files available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOCRResponse;