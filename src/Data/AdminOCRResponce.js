import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import apiClient from "../API/apiClient";
import { API_HOST, DOCUMENTHEADER_API, SYSTEM_ADMIN, BRANCH_ADMIN} from "../API/apiConfig";
import { EyeIcon, XMarkIcon, PrinterIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import AutoTranslate from '../i18n/AutoTranslate'; 
import FilePreviewModal from "../Components/FilePreviewModal";

const AdminOCRResponse = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const fetchDocuments = async () => {
    if (!responseData?.matching_files) {
      console.error("No matching files found in the response data");
      return;
    }

    try {
      const fetchedDocuments = new Map();

      for (const docName of responseData.matching_files) {
        try {
          const response = await axios.get(
            `${DOCUMENTHEADER_API}/findByDocName/${docName}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const documentId = response.data.response.id;
          const documentData = response.data.response;

          if (fetchedDocuments.has(documentId)) {
            // If the ID already exists, append the new docName to the existing one.
            const existingEntry = fetchedDocuments.get(documentId);
            existingEntry.docName += `, ${docName}`;
          } else {
            // Otherwise, add a new entry to the Map.
            fetchedDocuments.set(documentId, { docName, data: documentData });
          }
        } catch (err) {
          console.warn(`Failed to fetch document: ${docName}`, err.message);
        }
      }

      // Convert the Map values to an array and set the documents.
      setDocuments(Array.from(fetchedDocuments.values()));
    } catch (error) {
      console.error("Fetch documents error:", error.message);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      const token = localStorage.getItem("tokenKey");
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc.data || !doc.data.id) {
        console.error("Invalid document or missing ID");
        return null;
      }

      const documentId = doc.data.id.toString().trim();
      if (!documentId) {
        console.error("Document ID is empty or invalid", doc);
        return null;
      }

      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Handle both response.data being an array or potentially being documentDetails
      const paths = Array.isArray(response.data)
        ? response.data
        : doc.documentDetails || [];

      // Update the selected document state with full path information
      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: paths,
      }));

      return paths;
    } catch (error) {
      console.error("Error in fetchPaths:", error);
      showPopup(
        `Failed to fetch document paths: ${error.message || "Unknown error"}`,
        "error"
      );
      return null;
    }
  };

  const handleback = () => {
    const role = localStorage.getItem("role") || sessionStorage.getItem("role");
    if (role === SYSTEM_ADMIN) {
      navigate("/adminOcr");
    } else if (role === BRANCH_ADMIN) {
      navigate("/brAdminOcr");
    } else {
      navigate("/searchOcr");
    }
  }
  console.log("selectedDoc", selectedDoc);

  useEffect(() => {
    fetchDocuments();
  }, [responseData]);

  const openFile = async (file) => {
    try {
      // setIsOpeningFile(true);

      const branch = selectedDoc?.data?.employee.branch.name.replace(/ /g, "_");
      const department = selectedDoc?.data?.employee.department.name.replace(/ /g, "_");
      const year = selectedDoc?.data?.yearMaster.name.replace(/ /g, "_");
      const category = selectedDoc?.data?.categoryMaster.name.replace(/ /g, "_");
      const version = file.version;
      const fileName = file.docName.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch
      )}/${encodeURIComponent(department)}/${encodeURIComponent(
        year
      )}/${encodeURIComponent(category)}/${encodeURIComponent(
        version
      )}/${encodeURIComponent(fileName)}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      let blob = new Blob([response.data], { type: response.headers["content-type"] });
      let url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      // setIsOpen(false);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch or preview the file.");
    } finally {
      // setIsOpeningFile(false);
    }
  };

  const openModal = async (doc) => {
    if (!doc.data.id) {
      console.error("Invalid document or missing ID:", doc);
      alert(
        "The selected document is invalid or missing required information."
      );
      return;
    }

    try {
      setSelectedDoc(doc);
      const updatedPaths = await fetchPaths(doc);

      if (updatedPaths) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch paths:", error);
      alert("Could not load the document. Please try again later.");
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  console.log("selected Documents:", selectedDoc);

  useEffect(() => {
    if (selectedDoc && selectedDoc?.data?.id) {
      fetchQRCode(selectedDoc?.data?.id);
    }
  }, [selectedDoc]);

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to fetch the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc?.data?.id}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();

      console.log("Fetched QR code Blob:", qrCodeBlob);

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error("Received data is not a valid image");
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      setQrCodeUrl(qrCodeUrl);
    } catch (error) {
      // setError("Error displaying QR Code: " + error.message);
    }
  };

  const downloadQRCode = async () => {
    if (!selectedDoc?.data?.id) {
      alert("Please enter a document ID");
      return;
    }

    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to download the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc?.data?.id}`;

      // Fetch the QR code as a Blob (binary data) with the token in the Authorization header
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch QR code");
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      // Create an anchor link to trigger the download
      const link = document.createElement("a");
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`; // Set a default name for the file
      link.click();

      // Clean up URL object
      window.URL.revokeObjectURL(qrCodeUrl);
    } catch (error) {
      // setError("Error downloading QR Code: " + error.message);
    } finally {
      // setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    const branch = selectedDoc.employee.branch.name.replace(/ /g, "_");
    const department = selectedDoc.employee.department.name.replace(/ /g, "_");
    const year = selectedDoc.yearMaster.name.replace(/ /g, "_");
    const category = selectedDoc.categoryMaster.name.replace(/ /g, "_");
    const version = file.version;
    const fileName = file.docName.replace(/ /g, "_");

    const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
      branch
    )}/${encodeURIComponent(department)}/${encodeURIComponent(
      year
    )}/${encodeURIComponent(category)}/${encodeURIComponent(
      version
    )}/${encodeURIComponent(fileName)}`;

    const response = await apiClient.get(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    });

    const downloadBlob = new Blob([response.data], {
      type: response.headers["content-type"],
    });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(downloadBlob);
    link.download = file.docName; // download actual name with extension
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4 font-semibold text-gray-800">Document Text Search (OCR)</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-1">
            <label className="text-md font-medium w-full">
              Your Search Query:
            </label>
            <input
              disabled
              value={JSON.stringify(responseData.query, null, 2)}
              className="bg-slate-800 text-white p-2 rounded-lg w-full text-center cursor-not-allowed opacity-70"
            />

            <button
              onClick={handleback}
              className="bg-blue-500 w-full text-white px-2 py-2 rounded-md hover:bg-blue-600 transition duration-300 no-print"
              aria-label="Back to OCR Search"
            >
              Back to OCR Search

            </button>


          </div>

        </div>

        <h1 className="font-bold">Your Matching Documents</h1>
        <table className="w-full border-collapse border mt-2">
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 text-left">S.N.</th>
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">File No</th>
              <th className="border p-2 text-left">Subject</th>
              <th className="border p-2 text-left">Year</th>
              <th className="border p-2 text-left">Category</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Branch</th>
              <th className="border p-2 text-left">Department</th>
              <th className="border p-2 text-left">Uploaded By</th>
              <th className="border p-2 text-left">View</th>
            </tr>
          </thead>
          <tbody>
            {documents.length > 0 ? (
              documents.map((doc, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{doc.data?.title || "N/A"}</td>
                  <td className="border p-2">{doc.data?.fileNo || "N/A"}</td>
                  <td className="border p-2">{doc.data?.subject || "N/A"}</td>
                  <td className="border p-2">
                    {doc.data?.yearMaster?.name || "N/A"}
                  </td>
                  <td className="border p-2">
                    {doc.data?.categoryMaster?.name || "N/A"}
                  </td>
                  <td className="border p-2">
                    {doc.data?.approvalStatus || "N/A"}
                  </td>
                  <td className="border p-2">
                    {doc.data?.employee?.branch?.name || ""}
                  </td>
                  <td className="border p-2">
                    {doc.data?.employee?.department?.name || ""}
                  </td>
                  <td className="border p-2">
                    {doc.data?.employee?.name || ""}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => openModal(doc)}
                      aria-label="View Document"
                    >
                      <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="text-center py-4">
                  No Records Found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownload={handleDownload}
          fileType={contentType}
          fileUrl={blobUrl}
          fileName={selectedDocFile?.docName}
          fileData={selectedDocFile}
        />



        {/* Document Details Code */}
        <>
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
                        <p className="text-lg font-extrabold text-indigo-600 border-b-4 border-indigo-600">
                          D
                        </p>
                        <p className="text-lg font-extrabold text-indigo-600 border-t-4 border-indigo-600">
                          MS
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 sm:mt-0">
                        <strong>Uploaded Date:</strong>{" "}
                        {formatDate(selectedDoc?.data?.createdOn)}
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
                          {
                            label: "Category",
                            value: selectedDoc?.data?.categoryMaster?.name || "No Category",
                          },
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
                        {selectedDoc?.data ? (
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
                          <p className="text-gray-500">No QR code available</p>
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
                          <ul
                            className={`space-y-4 ${printTrue === false && selectedDoc.paths.length > 2
                              ? "max-h-60 overflow-y-auto print:max-h-none print:overflow-visible"
                              : ""
                              }`}
                          >
                            {selectedDoc?.paths
                              .filter((file) => {
                                const docNames = selectedDoc.docName
                                  .split(",")
                                  .map((name) => name.trim());
                                return docNames.includes(file.docName);
                              })
                              .map((file, index) => (
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

        </>
      </div>
    </div>
  );
};

export default AdminOCRResponse;
