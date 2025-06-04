import { useEffect, useState, useMemo } from "react";
import apiClient from "../API/apiClient";
import {
  API_HOST,
  BRANCH_ADMIN,
  DEPARTMENT_ADMIN,
  USER,
} from "../API/apiConfig";
import { useLocation, useNavigate } from "react-router-dom";
import { BsQrCode } from "react-icons/bs";
import Popup from "../Components/Popup";
import axios from "axios";
import QrReader from "react-qr-reader";
import FilePreviewModal from "../Components/FilePreviewModal";



const SearchByScan = () => {
  const navigate = useNavigate();
  const [headerData, setHeaderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrEmpid, setQrEmpid] = useState(null);
  const [qrBranchid, setQrBranchid] = useState(null);
  const [qrDepartmentid, setQrDepartmentid] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loginBranchid, setLoginBranchid] = useState(null);
  const [loginDepartmentid, setLoginDepartmentid] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [responses, setResponses] = useState(null);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("tokenKey");
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");
  const [popupMessage, setPopupMessage] = useState(null);
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const sanitizeString = (str) => str?.replace(/ /g, "_") || "";
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");

  const unauthorizedMessage = "You are not authorized to scan this QR code.";
  const invalidQrMessage = "Invalid QR Code.";
  // const uploadErrorMessage = "Failed to upload or read QR code from the image.";
  let actionByName;
  let isUnauthorized = false;

  const handleQrCheck = (qrParams) => {
    let isUnauthorized = false;

    if (role === BRANCH_ADMIN) {
      isUnauthorized = loginBranchid != qrParams.branchId;
    } else if (role === DEPARTMENT_ADMIN) {
      isUnauthorized =
        loginBranchid != qrParams.branchId ||
        loginDepartmentid != qrParams.departmentId;
    } else if (role === USER) {
      isUnauthorized = userId != qrParams.empId;
    }

    if (isUnauthorized) {
      showPopup(unauthorizedMessage, "warning");
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (cameraActive && !stream) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          setStream(mediaStream);
        })
        .catch((err) => {
          setError("Error accessing camera: " + err.message);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive, stream]);

  useEffect(() => {
    fetchLoginUser();
  }, [userId, token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const branchId = params.get("b");
    const departmentId = params.get("d");
    const empId = params.get("e");
    const id = params.get("id");

    if (!id && !branchId && !departmentId && !empId) {
      return;
    }

    if ((!branchId || !departmentId || !empId) && id) {
      showPopup(invalidQrMessage, "error");
      return;
    }
    if (branchId && departmentId && empId) {
      setQrBranchid(branchId);
      setQrDepartmentid(departmentId);
      setQrEmpid(empId);
    }

    if (id) {
      const qrParams = { branchId, departmentId, empId };

      if (!handleQrCheck(qrParams)) {
        fetchDocument(id);
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (!qrData) return;

    let params;
    try {
      const queryString = qrData.split("?")[1];
      if (!queryString) {
        console.log("No parameters provided in the QR code");
        return;
      }

      params = new URLSearchParams(queryString);
    } catch (error) {
      console.error("Invalid QR data format:", error);
      return;
    }

    const branchId = params.get("b");
    const departmentId = params.get("d");
    const empId = params.get("e");
    const id = params.get("id");

    if (!id && !branchId && !departmentId && !empId) {
      console.log("No parameters provided in the QR code");
      return;
    }

    if ((!branchId || !departmentId || !empId) && id) {
      showPopup(invalidQrMessage, "error");
      return;
    }

    if (branchId && departmentId && empId) {
      setQrBranchid(branchId);
      setQrDepartmentid(departmentId);
      setQrEmpid(empId);

      console.log("Extracted QR data:", { empId, branchId, departmentId });
    }

    if (id) {
      const qrParams = { branchId, departmentId, empId };

      if (!handleQrCheck(qrParams)) {
        fetchDocument(id);
      }
    }
  }, [qrData]);

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

  const handleToggleCamera = () => {
    setCameraActive((prev) => !prev);
    setQrData(null);
  };

  const fetchLoginUser = async () => {
    if (!userId || !token) {
      console.error("userId or token is missing");
      return;
    }

    try {
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        console.log("login user data", response.data);
        const { branch, department } = response.data || {};
        if (branch && department) {
          setLoginBranchid(branch.id);
          setLoginDepartmentid(department.id);
        } else {
          console.error("Branch or Department data is missing in the response");
        }
      } else {
        console.error("Failed to fetch user data:", response.statusText);
      }
    } catch (error) {
      console.error("Error during API call:", error);
      if (error.response) {
        console.error("Server error:", error.response.data);
      } else if (error.request) {
        console.error("No response received from the server:", error.request);
      } else {
        console.error("Request error:", error.message);
      }
    }
  };

  const fetchDocument = async (id) => {
    if (!id) {
      setError("No document ID found.");
      return;
    }

    if (!token) {
      const currentUrl = window.location.href;
      localStorage.setItem("redirectUrl", currentUrl);

      navigate("/login");
      return;
    }

    try {
      const response = await apiClient.get(`/api/documents/findBy/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHeaderData(response.data);
      setResponses(response.data);
      console.log(response.data);
    } catch (err) {
      if (err.response) {
        console.error("Error response from server:", err.response.data);
        const errorMessage =
          err.response.status === 404
            ? "Document not found. Please check the ID."
            : `Server error: ${err.response.statusText} (${err.response.status})`;
        setError(errorMessage);
      } else if (err.request) {
        console.error("No response received:", err.request);
        setError("No response from the server. Please try again later.");
      } else {
        console.error("Request error:", err.message);
        setError("Error occurred while setting up the request.");
      }
    }
  };

  const handlePopupClose = () => {
    setFile(null);
    const imageElement = document.getElementById("uploaded-image");
    if (imageElement) {
      imageElement.src = "";
      imageElement.classList.add("hidden");
    }
    navigate("/searchByScan");
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const imageElement = document.getElementById("uploaded-image");
        imageElement.src = e.target.result;
        imageElement.classList.remove("hidden");
      };
      reader.readAsDataURL(selectedFile);

      setFile(selectedFile);
      setTimeout(() => {
        handleSubmit(selectedFile);
      }, 2000);
    }
  };

  const handleSubmit = async (currentFile) => {
    const fileToSubmit = currentFile || file;

    if (!fileToSubmit) {
      showPopup("Please select a file", "warning");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileToSubmit);

    try {
      const response = await apiClient.post("/api/documents/read", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        const qrContent = response.data.qrContent;

        if (!qrContent) {
          showPopup(invalidQrMessage, "error");
          return;
        }

        const fragment = qrContent.split("#")[1];
        const params = new URLSearchParams(fragment.split("?")[1]);
        const id = params.get("id");

        const qrParams = {
          branchId: params.get("b"),
          departmentId: params.get("d"),
          empId: params.get("e"),
        };

        setQrBranchid(qrParams.branchId || null);
        setQrDepartmentid(qrParams.departmentId || null);
        setQrEmpid(qrParams.empId || null);

        if (id) {
          if (!handleQrCheck(qrParams)) {
            fetchDocument(id);
          }
        } else {
          showPopup(invalidQrMessage, "error");
        }
      }
    } catch (error) {
      showPopup(invalidQrMessage, "error");
    }
  };

  const openFile = async (docName, version) => {
    try {
      console.log("docName:", docName);
      console.log("version:", version);

      if (!docName) {
        showPopup("Document name is missing. Please try again.");
        return;
      }

      const branch = headerData?.employee?.branch?.name.replace(/ /g, "_");
      const department = headerData?.employee?.department?.name.replace(
        / /g,
        "_"
      );
      const year = headerData?.yearMaster?.name.replace(/ /g, "_");
      const category = headerData?.categoryMaster?.name.replace(/ /g, "_");

      const fileUrl = `${API_HOST}/api/documents/download/${encodeURIComponent(
        branch
      )}/${encodeURIComponent(department)}/${encodeURIComponent(
        year
      )}/${encodeURIComponent(category)}/${encodeURIComponent(
        version
      )}/${encodeURIComponent(docName)}`;
      const token = localStorage.getItem("tokenKey");

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      let blob = new Blob([response.data], { type: response.headers["content-type"] });
      let url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      setIsOpen(false);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch or preview the file.");
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

  const filteredDocFiles = useMemo(() => {
  const files = headerData?.documentDetails || [];

  if (!Array.isArray(files)) return [];

  return files.filter((file) => {
    const name = file.docName?.toLowerCase() || "";
    const version = String(file.version).toLowerCase();
    const term = searchFileTerm.toLowerCase();
    return name.includes(term) || version.includes(term);
  });
}, [selectedDoc, headerData, searchFileTerm]);



  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  if (headerData?.approvalStatus === "REJECTED") {
    actionByName = "Rejected";
  } else if (headerData?.approvalStatus === "APPROVED") {
    actionByName = "Approved";
  }

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">
        DOCUMENT SEARCH BY QR CODES
      </h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={handlePopupClose} // Trigger refresh on close
          />
        )}

        {headerData && (
          <>
            <div className="mb-4 bg-slate-100 p-4 rounded-lg">
              <div className="grid grid-cols-4 gap-4">
                <label className="block text-md font-medium text-gray-700">
                  File No.
                  <input
                    disabled
                    value={headerData?.fileNo}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Title
                  <input
                    disabled
                    value={headerData?.title}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Subject
                  <input
                    disabled
                    value={headerData?.subject}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Category
                  <input
                    disabled
                    value={headerData?.categoryMaster?.name}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Uploaded Date
                  <input
                    disabled
                    value={formatDate(headerData?.createdOn)}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Uploded By
                  <input
                    disabled
                    value={headerData?.employee?.name}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Department
                  <input
                    disabled
                    value={headerData?.employee?.department?.name}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Branch
                  <input
                    disabled
                    value={headerData?.employee?.branch?.name}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="block text-md font-medium text-gray-700">
                  Document Status
                  <input
                    disabled
                    value={headerData?.approvalStatus}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {headerData?.approvalStatus !== "PENDING" && (
                  <>
                    <label className="block text-md font-medium text-gray-700">
                      {actionByName} Date
                      <input
                        disabled
                        value={formatDate(headerData?.approvalStatusOn)}
                        className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="block text-md font-medium text-gray-700">
                      {actionByName} By
                      <input
                        disabled
                        value={headerData?.employeeBy?.name}
                        className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}
                {headerData?.approvalStatus === "REJECTED" && (
                  <>
                    <label className="block text-md font-medium text-gray-700">
                      Rejected Resion
                      <input
                        disabled
                        value={headerData?.rejectionReason}
                        className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </>
                )}

                <label className="block text-md font-medium text-gray-700">
                  Document Year
                  <input
                    disabled
                    value={headerData?.yearMaster?.name}
                    className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>

              <FilePreviewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDownload={handleDownload}
                fileType={contentType}
                fileUrl={blobUrl}
                fileName={selectedDocFile?.docName}
                fileData={selectedDocFile}
              />

              <div className="mt-6 text-center">
                <div className="mt-6 relative">
                  <div className="flex justify-center">
                    <h2 className="text-lg font-semibold text-indigo-700">Attached Files</h2>
                  </div>
                  <div className="absolute right-0 top-0">
                    <input
                      type="text"
                      placeholder="Search Files..."
                      value={searchFileTerm}
                      onChange={(e) => setSearchFileTerm(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                {filteredDocFiles?.length > 0 ? (
                  <div className="overflow-x-auto mt-4">
                    <table className="table-auto w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-indigo-100">
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            S.N.
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Document Name
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Version
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocFiles.map((file, index) => {
                          const displayName = file.docName.includes("_")
                            ? file.docName.split("_").slice(1).join("_")
                            : file.docName;

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2">
                                {index + 1}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {displayName}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {file.version}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <button
                                 
                                  onClick={() => {
                                    setSelectedDocFiles(file);
                                    openFile(file.docName, file.version)
                                  }}
                                  className={`bg-indigo-500 text-white px-3 py-1 rounded shadow-md hover:bg-indigo-600 transition no-print ${loading ? "opacity-50" : ""
                                    }`}
                                  disabled={loading}
                                  aria-label={`Open ${displayName}`}
                                >
                                  {loading ? "Loading..." : "Open"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    No attached files available.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          {responses === null && (
            <>
              <div className="w-72 h-[312px] items-center justify-center ">
                <div className="p-6 max-w-lg mx-auto bg-white shadow-md rounded-md relative w-72 h-72">
                  <div className="absolute top-0 left-0 right-0 bottom-0 border-t-2 border-indigo-500 animate-scan-line"></div>
                  <img
                    id="uploaded-image"
                    className="object-cover w-full h-full"
                    src={file ? URL.createObjectURL(file) : ""}
                    alt={file ? "Uploaded QR Code" : "Click to upload"}
                    style={{ display: file ? "block" : "none" }}
                  />
                </div>
                <form onSubmit={handleSubmit} className="relative z-10 ">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <div
                    className="w-[60%] mt-2  h-full flex justify-center items-center border border-gray-300 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() =>
                      document.getElementById("file-upload").click()
                    }
                  >
                    {!file && (
                      <p className="flex gap-3 items-center justify-center text-gray-500">
                        <BsQrCode />
                        Choose QR Code
                      </p>
                    )}
                  </div>
                </form>
              </div>

              <div className="flex flex-col items-center w-72 h-[312px] p-4">
                {!cameraActive && (
                  <button
                    onClick={handleToggleCamera}
                    className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition duration-200"
                  >
                    Open Camera
                  </button>
                )}

                {cameraActive && (
                  <div className="mt-4 flex flex-col items-center">
                    <QrReader
                      delay={300}
                      onError={(err) => {
                        console.error("QR Scan Error:", err);
                        setError(err?.message || "Unknown error");
                      }}
                      onScan={(data) => {
                        if (data) {
                          setQrData(data);
                        }
                      }}
                      style={{ width: "300px" }}
                      className="border border-gray-300 rounded"
                      facingMode="environment"
                    />

                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchByScan;
