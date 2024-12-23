import { useEffect, useState } from "react";
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
import { QrReader } from "react-qr-reader";

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

  const openFile = async (file) => {
    const branch = sanitizeString(headerData?.employee?.branch?.name);
    const department = sanitizeString(headerData?.employee?.department?.name);
    const year = sanitizeString(headerData?.yearMaster?.name);
    const category = sanitizeString(headerData?.categoryMaster?.name);
    const version = sanitizeString(headerData?.version);

    const fileUrl = `${API_HOST}/api/documents/download/${branch}/${department}/${year}/${category}/${version}/${file}`;

    setLoading(true);
    try {
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      const newWindow = window.open(blobUrl, "_blank");
      if (newWindow)
        newWindow.onload = () => window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const errorMessage = error.response
        ? `Error ${error.response.status}: Unable to fetch the file.`
        : error.request
        ? "No response from server. Please check your connection."
        : "An unexpected error occurred.";
      console.error(errorMessage);
      showPopup(errorMessage);
    } finally {
      setLoading(false);
    }
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

  if (headerData?.approvalStatus === "REJECTED") {
    actionByName = "Rejected";
  } else if (headerData?.approvalStatus === "APPROVED") {
    actionByName = "Approved";
  }

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">
        DOCUMENT SEARCH BY QR CODES
      </h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
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
                  Version{" "}
                  <input
                    disabled
                    value={headerData?.version}
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

              <div className="mt-6 text-center">
                <h2 className="text-lg font-semibold text-indigo-700">
                  Attached Files
                </h2>
                {headerData?.documentDetails?.length > 0 ? (
                  <ul className="list-disc list-inside text-left mt-2">
                    {headerData?.documentDetails.map((file, index) => {
                      const displayName = file.docName.includes("_")
                        ? file.docName.split("_").slice(1).join("_")
                        : file.docName;

                      return (
                        <li key={index} className="mb-2">
                          <span className="mr-4 text-gray-600">
                            <strong>{index + 1}</strong> {displayName}
                          </span>
                          <button
                            onClick={() => openFile(file.docName)}
                            className={`bg-indigo-500 text-white px-3 py-1 rounded shadow-md hover:bg-indigo-600 transition no-print ${
                              loading ? "opacity-50" : ""
                            }`}
                            disabled={loading}
                            aria-label={`Open ${displayName}`}
                          >
                            {loading ? "Loading..." : "Open"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
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
                  <div className="mt-4">
                    <QrReader
                      onResult={(result, error) => {
                        if (result) {
                          setQrData(result.text);
                          setCameraActive(false); // Turn off camera after successful scan
                        }
                        if (error) {
                          setError(error?.message);
                        }
                      }}
                      style={{ width: "100%" }}
                      className="w-80 h-80"
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
