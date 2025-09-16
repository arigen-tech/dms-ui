import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../API/apiClient";
import { useLocation } from "react-router-dom";
import Popup from "../Components/Popup";
import { useDropzone } from "react-dropzone";
import FilePreviewModal from "../Components/FilePreviewModal";
import LoadingComponent from '../Components/LoadingComponent';


import {
  PencilIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import { API_HOST, DOCUMENTHEADER_API, FILETYPE_API } from "../API/apiConfig";

const DocumentManagement = ({ fieldsDisabled }) => {
  const location = useLocation();
  const data = location.state;
  const [formData, setFormData] = useState({
    fileNo: "",
    title: "",
    subject: "",
    version: "",
    category: null,
    uploadedFilePaths: [],
  });
  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [uploadedFilePath, setUploadedFilePath] = useState([]);
  // const [uploadedFileVersion, setUploadedFileVersion] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [handleEditDocumentActive, setHandleEditDocumentActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [isUploadEnabled, setIsUploadEnabled] = useState(false);
  const [printTrue, setPrintTrue] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [userBranch, setUserBranch] = useState([]);
  const [userDep, setUserDep] = useState([]);
  const fileInputRef = useRef(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null); // To hold the document being edited
  const [popupMessage, setPopupMessage] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [filesType, setFilesType] = useState([]);
  const [unsportFile, setUnsportFile] = useState(false);
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false);
  const [folderUpload, setFolderUpload] = useState(false);
  const [uploadController, setUploadController] = useState(null);
  const [blobUrl, setBlobUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedDocFile, setSelectedDocFiles] = useState(null);
  const [searchFileTerm, setSearchFileTerm] = useState("");
  const [openingFileIndex, setOpeningFileIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bProcess, setBProcess] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [openingFiles, setOpeningFiles] = useState(null);
  const [deletingFiles, setDeletingFiles] = useState(null);
  const formSectionRef = useRef(null);



  console.log("formData", formData);
  useEffect(() => {
    if (data) {
      handleEditDocument(data);
    }
    fetchCategory();
    fetchYear();
    fetchDocuments();
    fetchPaths();
    fetchUser();

  }, []);


  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);

      }
    });
  };

  console.log("already uploaded", uploadedFilePath);

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFilesType(response?.data?.response ?? []);
    } catch (error) {
      console.error('Error fetching Files Types:', error);
      setFilesType([]);
    }
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = categoryOptions.find(
      (category) => category.id === parseInt(e.target.value)
    );
    setFormData({ ...formData, category: selectedCategory });
  };

  const handleYearChange = (e) => {
    const selectedYear = yearOptions.find(
      (year) => year.id === parseInt(e.target.value)
    );
    setFormData({ ...formData, year: selectedYear });
  };

  useEffect(() => {
    const { fileNo, title, subject, version, category, year } = formData;
    const isFormFilled =
      fileNo &&
      title &&
      subject &&
      version &&
      category &&
      year &&
      selectedFiles.length > 0;
    setIsUploadEnabled(isFormFilled);
  }, [formData, selectedFiles]);

  // Fetch categories
  const fetchCategory = async () => {
    try {
      const response = await apiClient.get(
        `${API_HOST}/CategoryMaster/findActiveCategory`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCategoryOptions(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchYear = async () => {
    try {
      const response = await apiClient.get(
        `${API_HOST}/YearMaster/findActiveYear`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const currentYear = new Date().getFullYear();

      // ✅ Always normalize to array
      const yearsData = Array.isArray(response.data)
        ? response.data
        : response.data
          ? [response.data]
          : [];

      const filteredYears = yearsData
        .filter((yearObj) => parseInt(yearObj.name) <= currentYear)
        .sort((a, b) => parseInt(b.name) - parseInt(a.name));

      setYearOptions(filteredYears);
    } catch (error) {
      console.error("Error fetching Year:", error);
    }
  };




  const fetchUser = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await apiClient.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserBranch(response.data.branch.name);
      setUserDep(response.data.department.name);
    } catch (error) {
      console.error("Error fetching user branch:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `${DOCUMENTHEADER_API}/pending/employee/${UserId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDocuments(response.data);
      setTotalItems(response.data.length);
    } catch (error) {
      console.error("Error fetching documents:", error);
      // Optional: Add more detailed error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request);
      } else {
        // Something happened in setting up the request
        console.error("Error setting up request:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  console.log("all doc by user", documents);

  // const extractFiles = async (items, fileList = []) => {
  //   for (const item of items) {
  //     if (item.kind === "file") {
  //       fileList.push(item.getAsFile());
  //     } else if (item.kind === "directory") {
  //       const directoryReader = item.createReader();
  //       const readEntries = async () => {
  //         const entries = await new Promise((resolve) =>
  //           directoryReader.readEntries(resolve)
  //         );
  //         if (entries.length > 0) {
  //           await extractFiles(entries, fileList);
  //         }
  //       };
  //       await readEntries();
  //     }
  //   }
  //   return fileList;
  // };

  const onDrop = useCallback(async (acceptedFiles, event) => {
    let files = acceptedFiles;
    console.log("Dropped Files:", acceptedFiles);

    let isFolderDropped = false;

    files.forEach((file) => {
      const path = file.path || file.webkitRelativePath || file.name;
      const slashCount = (path.match(/[\\/]/g) || []).length;

      if (slashCount > 1) {
        isFolderDropped = true;
      }
    });

    if (isFolderDropped && !folderUpload) {
      showPopup("Please enable 'folderUpload' to upload folders.", "warning");
      return;
    }

    if (!isFolderDropped && folderUpload) {
      showPopup("Please disable 'folderUpload' to upload files.", "warning");
      return;
    }

    setSelectedFiles(files);

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
  }, [folderUpload]);


  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    directory: folderUpload,
    multiple: !folderUpload,
  });

  const openFile = async (file) => {
    try {
      setOpeningFiles(true);

      // Encode each segment separately to preserve folder structure
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("❌ Error fetching file:", error);
      alert("Failed to fetch or preview the file.");
    } finally {
      setOpeningFiles(false);
    }
  };



  const openFileBeforeSubmit = async (file, index) => {
    setOpeningFiles(index);
    try {
      const fileUrl = `${API_HOST}/api/documents/download/${file}`;
      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);

      setBlobUrl(url);
      setContentType(response.headers["content-type"]);
      setSearchFileTerm("");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch or preview the file.");
    } finally {
      setOpeningFiles(null);
    }
  };

  const handleDownload = async (file) => {
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`;

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
    if (!selectedDoc || !Array.isArray(selectedDoc.paths)) return [];

    return selectedDoc.paths.filter((file) => {
      const name = file.docName.toLowerCase();
      const version = String(file.version).toLowerCase();
      const term = searchFileTerm.toLowerCase();
      return name.includes(term) || version.includes(term);
    });
  }, [selectedDoc, searchFileTerm]);

  console.log("filteredDocFiles", filteredDocFiles);

  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true);
      setTimeout(() => {
        setLoadingFiles(false);
      }, 300);
    }
  }, [selectedDoc]);


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };
    return date.toLocaleString("en-GB", options).replace(",", "");
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setIsUploadEnabled(true);
    } else {
      setIsUploadEnabled(false);
    }
  };

  //   const handleFileChange = (event) => {
  //   const files = Array.from(event.target.files);

  //   if (files.length > 0) {
  //     const { category, year, version } = formData;

  //     // Map through files and rename
  //     const renamedFiles = files.map((file) => {
  //       const timestamp = Date.now();
  //       const baseName = file.name.split(".")[0].substring(0, 3); // first 3 chars
  //       const extension = file.name.split(".").pop(); // keep extension

  //       const newFileName = `${timestamp}_${baseName}_${category.name}_${year.name}_v${version || 1}.${extension}`;

  //       // Create a new File object with the new name
  //       return new File([file], newFileName, { type: file.type });
  //     });

  //     setSelectedFiles(renamedFiles);
  //     setIsUploadEnabled(true);
  //   } else {
  //     setIsUploadEnabled(false);
  //   }
  // };

  const handleUploadDocument = async () => {
    if (selectedFiles.length === 0) {
      showPopup("Please select at least one file to upload.", "warning");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadData = new FormData();
    const { category, year, version, fileNo, status } = formData;

    uploadData.append("category", category?.name);
    uploadData.append("year", year?.name); // or year?.id if API expects id
    uploadData.append("version", version || 1);
    uploadData.append("branch", userBranch);
    uploadData.append("department", userDep);

    // ✅ Rename unique files name before uploading
    const renamedFiles = selectedFiles.map((file, index) => {
      const now = new Date();
      const formattedDate = `${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
        now.getSeconds()
      ).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;

      const baseName = fileNo.split(".")[0].substring(0, 3);
      const extension = file.name.split(".").pop();

      return {
        file,
        renamed: `${baseName}_${category?.name}_${year?.name}_${version}_${formattedDate}_${index + 1}.${extension}`,
      };
    });

    renamedFiles.forEach(({ file, renamed }) => {
      uploadData.append("files", file, renamed);
    });

    const controller = new AbortController();
    setUploadController(controller);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_HOST}/api/documents/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setUploadController(null);

        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);

          if (result.uploadedFiles.length > 0) {
            // ✅ Store renamed file names for display
            setUploadedFileNames((prevNames) => [
              ...prevNames,
              ...renamedFiles.map((f) => f.renamed),
            ]);

            // ✅ Map backend relative paths + keep renamed display name
            setUploadedFilePath((prevPath) => [
              ...prevPath,
              ...result.uploadedFiles.map((fileObj, index) => ({
                path: fileObj.relativePath, // actual backend path
                version: `${version}`,
                yearMaster: year,
                status: status,
                displayName: renamedFiles[index]?.renamed, // your renamed name
              })),
            ]);

            // ✅ Also save in formData if needed
            setFormData((prevData) => ({
              ...prevData,
              uploadedFilePaths: [
                ...(prevData.uploadedFilePaths || []),
                ...result.uploadedFiles.map((fileObj, index) => ({
                  path: fileObj.relativePath,
                  version: `${version}`,
                  yearMaster: year,
                  status: status,
                  displayName: renamedFiles[index]?.renamed,
                })),
              ],
              version: "", // reset version
            }));

            if (fileInputRef.current) {
              fileInputRef.current.value = null;
            }

            showPopup("Files uploaded successfully!", "success");
          }

          if (result.errors.length > 0) {
            showPopup(
              `Some files failed to upload:\n${result.errors
                .map((err) => `${err.file}: ${err.error}`)
                .join("\n")}`,
              "error"
            );
            setUnsportFile(true);
          }
        } else {
          showPopup(`File upload failed: ${xhr.statusText}`, "error");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        showPopup("Upload failed due to a network error.", "error");
      };

      xhr.onabort = () => {
        setIsUploading(false);
        setUploadController(null);
        showPopup("Upload has been canceled.", "warning");
      };

      controller.signal.addEventListener("abort", () => {
        xhr.abort();
      });

      xhr.send(uploadData);
    } catch (error) {
      setIsUploading(false);
      showPopup(`File upload failed: ${error.message}`, "error");
    }
  };




  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadController(null);
      setIsUploading(false);
      showPopup("Upload has been canceled.", "warning");
    }
  };

  const handleEditDocument = (doc) => {
    console.log("Editing document:", doc);
    setHandleEditDocumentActive(true);
    setEditingDoc(doc);

    const existingFiles = (doc.documentDetails || []).map((detail) => ({
      name: detail.path.split("/").pop(),
      version: detail.version,
      path: detail.path,
      status: detail.status,
      yearMaster: detail?.yearMaster || null, // ✅ keep full yearMaster object
      isExisting: true,
    }));

    setFormData({
      fileNo: doc.fileNo,
      title: doc.title,
      subject: doc.subject,
      version: doc.version,
      category: doc.categoryMaster || null,
      year: null, // ✅ pick year from first file (or handle UI differently if multiple years exist)
    });

    setUploadedFileNames(
      existingFiles.map((file) => file.name)
    );


    setUploadedFilePath(
      existingFiles.map((file) => ({
        path: file.path,
        version: file.version,
        status: file.status,
        yearMaster: file.yearMaster || null, // ✅ correctly preserved
      }))
    );
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };


  const handleSaveEdit = async () => {
    const userId = localStorage.getItem("userId");

    if (!userId || !token) {
      showPopup("User not logged in. Please log in again.", "error");
      return;
    }

    const { fileNo, title, subject, category } = formData;

    if (
      !fileNo ||
      !title ||
      !subject ||
      !category ||

      uploadedFilePath.length === 0
    ) {
      showPopup("Please fill in all the required fields and upload files.", "error");
      return;
    }

    const versionedFilePaths = uploadedFilePath.map((file) => ({
      path: file.path,
      version: file.version,
      yearId: file.yearMaster?.id,
    }));

    const payload = {
      documentHeader: {
        id: editingDoc.id,
        fileNo,
        title,
        subject,
        categoryMaster: { id: category.id },
        // yearMaster: { id: year.id },
        employee: { id: parseInt(userId, 10) },
      },
      filePaths: versionedFilePaths,
    };

    try {
      setBProcess(true);

      const response = await fetch(`${API_HOST}/api/documents/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      console.log("API result:", result); // For debugging

      // ✅ Handle failure conditions
      if (!response.ok || result?.status === 409 || result?.message?.toLowerCase() !== "success") {
        const warningMessage =
          result?.response?.msg || result?.message || "Unknown error occurred";
        showPopup(`Document update failed: ${warningMessage}`, "warning");
        return;
      }

      // ✅ Handle success case
      const successMessage =
        result?.response?.msg || result?.message || "Document updated successfully!";
      showPopup(successMessage, "success");

      resetEditForm();
      fetchDocuments();

    } catch (error) {
      console.error("Error updating document:", error);
      showPopup(`Document update failed: ${error.message}`, "warning");
    } finally {
      setBProcess(false);
    }
  };



  const resetEditForm = () => {
    setFormData({
      fileNo: "",
      title: "",
      subject: "",
      version: "",
      category: null,
      // year: null,
    });
    setUploadedFilePath([]);
    setSelectedFiles([]);
    setUploadedFileNames([]);
    // setUploadedFileVersion([]);
    setEditingDoc(null);
    setUnsportFile(false);
  };

  const viewfiletype = () => {
    fetchFilesType();
    setViewFileTypeModel(true);
    setIsUploading(false);
  }

  const handlecloseFileType = () => {
    setViewFileTypeModel(false);
    setIsUploading(false);
  }


  console.log("uploadedFilePath before version change", formData);


  const handleVersionChange = (index, newVersion) => {
    setUploadedFilePath((prevPaths) =>
      prevPaths.map((file, i) =>
        i === index
          ? { ...file, version: newVersion } // Use the input as is, no prefix modification
          : file
      )
    );
  };

  console.log("uploadedFilePath", formData.uploadedFilePaths);

  // Handle adding the document
  const handleAddDocument = async () => {
    if (
      !formData.fileNo ||
      !formData.title ||
      !formData.subject ||
      !formData.category ||
      formData.uploadedFilePaths.length === 0
    ) {
      showPopup(
        "Please fill in all the required fields and upload a file.",
        "error"
      );
      return;
    }

    // ✅ Prepare file paths for backend
    const versionedFilePaths = formData.uploadedFilePaths.map((file) => ({
      path: file.path || file.displayName || "Unknown", // use path first
      version: file.version || formData.version || "1.0",
      yearId: file.yearMaster?.id || formData.year?.id || null,
    }));

    // ✅ Construct payload
    const payload = {
      documentHeader: {
        id: formData.id || null, // only if updating
        fileNo: formData.fileNo,
        title: formData.title,
        subject: formData.subject,
        categoryMaster: { id: formData.category.id },
        employee: { id: parseInt(UserId, 10) },
        qrPath: formData.qrPath || null,
        archive: false,
      },
      filePaths: versionedFilePaths,
    };

    try {
      setBProcess(true);

      const response = await fetch(`${API_HOST}/api/documents/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result?.status === 409) {
        const errorMessage =
          result?.response?.msg || result?.message || "Unknown error";
        showPopup(`Document save failed: ${errorMessage}`, "warning");
        return;
      }

      showPopup(result?.response?.msg || "Document saved successfully", "success");

      // ✅ Reset form after save
      setFormData({
        fileNo: "",
        title: "",
        subject: "",
        version: "",
        category: null,
        year: null,
        uploadedFilePaths: [],
      });
      setUploadedFilePath([]);
      setUploadedFileNames([]);
      fetchDocuments(); // refresh list
    } catch (error) {
      console.error("Error saving document:", error);
      showPopup(`Document save failed: ${error.message}`, "warning");
    } finally {
      setBProcess(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc || !doc.id) {
        console.error("Invalid document or missing ID");
        return null;
      }

      const documentId = doc.id.toString().trim();
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


  const handleDiscardFile = (index) => {
    if (index < 0 || index >= uploadedFilePath.length) {
      console.error("Invalid index:", index);
      return;
    }

    setDeletingFiles(index);

    try {
      if (editingDoc) {
        const isExistingFile = index < (editingDoc.documentDetails?.length || 0);

        if (isExistingFile) {
          const updatedFileNames = uploadedFileNames.filter((_, i) => i !== index);
          const updatedFilePath = uploadedFilePath.filter((_, i) => i !== index);

          setUploadedFileNames(updatedFileNames);
          setUploadedFilePath(updatedFilePath);

          setFormData((prev) => ({
            ...prev,
            removedFilePaths: [
              ...(prev.removedFilePaths || []),
              uploadedFilePath[index],
            ],
          }));
        } else {
          setUploadedFileNames((prev) => prev.filter((_, i) => i !== index));
          setUploadedFilePath((prev) => prev.filter((_, i) => i !== index));
        }
      } else {
        setUploadedFileNames((prev) => prev.filter((_, i) => i !== index));
        setUploadedFilePath((prev) => prev.filter((_, i) => i !== index));
      }

      console.log("File deleted successfully:", uploadedFilePath[index]);
    } catch (err) {
      console.error("Error while deleting file:", err);
      alert("Failed to delete file. Please try again.");
    } finally {
      setDeletingFiles(null);
    }
  };



  const handleDiscardAll = () => {
    if (editingDoc) {
      // Handle discarding all during edit mode
      const removedFilePaths = [
        ...(formData.removedFilePaths || []),
        ...uploadedFilePath,
      ];

      setUploadedFileNames([]);
      setUploadedFilePath([]);
      setFormData({
        ...formData,
        uploadedFilePaths: [],
        removedFilePaths,
      });
    } else {
      // For new document upload
      setUploadedFileNames([]);
      setUploadedFilePath([]);
      setFormData({ ...formData, uploadedFilePaths: [] });
    }
  };

  const openModal = (doc) => {
    setSelectedDoc(doc); // Set the selected document without paths first
    fetchPaths(doc); // Fetch paths and update the selected document with paths
    setIsOpen(true);
  };

  console.log("selectedDoc", selectedDoc);


  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const printPage = () => {
    setPrintTrue(true);
    window.print();
    setTimeout(() => {
      setPrintTrue(false);
    }, 1000);
  };


  const handleYearChangeForFile = (index, yearId) => {
    if (!Array.isArray(yearOptions)) return;

    const selectedYear = yearOptions.find((y) => y.id === parseInt(yearId));
    if (!selectedYear) return;

    // ✅ update uploadedFilePath
    setUploadedFilePath((prev) =>
      prev.map((file, i) =>
        i === index ? { ...file, yearMaster: selectedYear } : file
      )
    );

    // ✅ update formData, but preserve other fields
    setFormData((prev) => ({
      ...prev,
      uploadedFilePaths: Array.isArray(prev.uploadedFilePaths)
        ? prev.uploadedFilePaths.map((file, i) =>
          i === index ? { ...file, yearMaster: selectedYear } : file
        )
        : [],
    }));
  };




  useEffect(() => {
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id);
    }
  }, [selectedDoc]);

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to fetch the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

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
      setError("Error displaying QR Code: " + error.message);
    }
  };

  console.log(error);

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert("Please enter a document ID");
      return;
    }

    try {
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      // API URL to download the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

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
      setError("Error downloading QR Code: " + error.message);
    } finally {
      // setLoading(false);
    }
  };

  // const handleSearchResults = (results) => {
  //   setSearchResults(results);
  //   setCurrentPage(1); // Reset to first page when new search results come in
  // };




  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage =
      Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  console.log("searchTerm", documents)


  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase();
    const createdDate = new Date(doc.createdOn).toLocaleDateString("en-GB");

    return (
      doc.title.toLowerCase().includes(search) ||
      doc.subject.toLowerCase().includes(search) ||
      doc.fileNo.toLowerCase().includes(search) ||
      // doc.yearMaster.name.toLowerCase().includes(search) ||
      doc.categoryMaster.name.toLowerCase().includes(search) ||
      doc.approvalStatus.toLowerCase().includes(search) ||
      createdDate.includes(search)
    );
  });


  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredFiles = (filesType ?? []).filter((file) =>
    file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.extension?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="p-2">
      <div {...getRootProps()} className="p-0">
        <input {...getInputProps()} />
        <h1 className="text-xl mb-2 font-semibold">Upload Document</h1>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          {popupMessage && (
            <Popup
              message={popupMessage.message}
              type={popupMessage.type}
              onClose={() => setPopupMessage(null)}
            />
          )}
          <div ref={formSectionRef} className="mb-2 bg-slate-100 p-4 rounded-lg">
            <div className="bg-slate-50 p-3 rounded-lg border shadow-sm mb-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                📁 File Metadata
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {/* File No Input */}
                <label className="block text-md font-medium text-gray-700">
                  File No.
                  <input
                    type="text"
                    placeholder="File No."
                    name="fileNo"
                    value={formData.fileNo}
                    onChange={(e) => setFormData({ ...formData, fileNo: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Title Input */}
                <label className="block text-md font-medium text-gray-700">
                  Title
                  <input
                    type="text"
                    placeholder="Title"
                    name="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Subject Input */}
                <label className="block text-md font-medium text-gray-700">
                  Subject
                  <input
                    type="text"
                    placeholder="Subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Category Select */}
                <label className="block text-md font-medium text-gray-700">
                  Category
                  <select
                    name="category"
                    value={formData.category?.id || ""}
                    onChange={handleCategoryChange}
                    disabled={formData.uploadedFilePaths?.length > 0}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border shadow-sm mb-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                📄 Document Metadata
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {/* Year */}
                <label className="block text-md font-medium text-gray-700">
                  Year
                  <select
                    name="year"
                    value={formData.year?.id || ""}
                    onChange={handleYearChange}
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Year</option>
                    {yearOptions.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Version */}
                <label className="block text-md font-medium text-gray-700">
                  Version
                  <input
                    type="text"
                    placeholder="Version"
                    name="version"
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    disabled={fieldsDisabled}
                    maxLength={20}
                    minLength={3}
                    required
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Show Supported File Types */}
                {unsportFile === true && (
                  <button
                    onClick={viewfiletype}
                    className="bg-blue-600 text-white h-12 px-2 mt-7 rounded-md"
                  >
                    Show Supported File Types
                  </button>
                )}

                {/* Folder Upload Enable */}
                <label className="block text-md font-medium text-gray-700">
                  Folder Upload Enable
                  <div className="flex mt-4">
                    <input
                      type="checkbox"
                      checked={folderUpload}
                      onChange={() => setFolderUpload(!folderUpload)}
                      className="mt-1 block w-5 h-5 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-3">
                      {folderUpload ? "Enable" : "Disable"}
                    </span>
                  </div>
                </label>

                {/* File/Folder Upload */}
                <label className="block text-md font-medium text-gray-700">
                  Upload {folderUpload ? "Folders" : "Files"}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=""
                    multiple
                    onChange={handleFileChange}
                    webkitdirectory={folderUpload ? "true" : undefined}
                    className="bg-white mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                {/* Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleUploadDocument}
                    disabled={
                      !isUploadEnabled ||
                      isUploading ||
                      !fileInputRef.current ||
                      fileInputRef.current.files.length === 0 ||
                      !formData.version
                    }
                    className={`flex-1 text-white rounded-xl p-3 h-14 flex items-center justify-center relative transition-all duration-300 ${isUploading
                      ? "bg-blue-600 cursor-not-allowed"
                      : isUploadEnabled
                        ? "bg-blue-900"
                        : "bg-gray-400"
                      }`}
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2 text-white"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          ></path>
                        </svg>
                        Adding... {uploadProgress}%
                      </>
                    ) : (
                      "Add Documents"
                    )}
                    {isUploading && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </button>

                  {isUploading && (
                    <button
                      onClick={handleCancelUpload}
                      className="bg-red-500 text-white h-14 px-4 py-2 rounded"
                    >
                      Cancel Add Files
                    </button>
                  )}
                </div>
              </div>



            </div>

            {editingDoc === null ? (
              formData?.uploadedFilePaths?.map((file, index) => {
                const displayName = uploadedFileNames[index];
                const version = file.version;
                const year = file?.yearMaster?.name;
                const status = file?.status;

                return (
                  <li
                    key={index}
                    className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-center gap-2 p-3 border rounded-xl shadow-sm bg-white hover:shadow-md transition"
                  >
                    {/* File Name */}
                    <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                      <span className="font-medium text-gray-800">{displayName}</span>
                    </div>

                    {/* Year */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-1">
                        <span className="text-sm font-medium text-gray-600">Year:</span>
                        <select
                          value={file?.yearMaster?.id || ""}
                          onChange={(e) => handleYearChangeForFile(index, e.target.value)}
                          disabled={!handleEditDocumentActive || status === "APPROVED"}
                          className="border rounded-lg px-2 py-1 text-sm w-24 text-center bg-gray-50"
                        >
                          <option value="">Select</option>
                          {yearOptions?.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Version */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Ver:</span>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => handleVersionChange(index, e.target.value.trim())}
                          className="border rounded-lg px-2 py-1 text-sm w-20 text-center"
                          disabled={!handleEditDocumentActive || status === "APPROVED"}
                          placeholder="v1"
                          maxLength={10}
                        />
                      </label>
                    </div>

                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium
                            ${status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                          {status || "PENDING"}
                        </span>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openFileBeforeSubmit(file?.path, index);
                        }}
                        disabled={openingFiles === index}
                        className={`rounded-lg px-3 py-1 text-sm transition ${openingFiles === index
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                      >
                        {openingFiles === index ? "Opening..." : "Open"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (deletingFiles !== index && status !== "APPROVED") {
                            handleDiscardFile(index);
                          }
                        }}
                        disabled={deletingFiles === index || status === "APPROVED"}
                        className={`rounded-lg px-3 py-1 text-sm transition ${deletingFiles === index || status === "APPROVED"
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                      >
                        {deletingFiles === index ? "Deleting..." : "Delete"}
                      </button>

                    </div>
                  </li>

                );
              })
            ) : (
              uploadedFilePath?.map((file, index) => {
                const displayName = uploadedFileNames[index];
                const version = file.version;
                const year = file?.yearMaster?.name;
                const status = file?.status;

                const isDisabled = formData?.uploadedFilePaths?.some(
                  (uploaded) => uploaded.path === file.path
                );

                return (
                  <li
                    key={index}
                    className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-center gap-2 p-3 border rounded-xl shadow-sm bg-white hover:shadow-md transition"
                  >
                    {/* File Name */}
                    <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                      <span className="font-medium text-gray-800">{displayName}</span>
                    </div>

                    {/* Year */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Year:</span>
                        <select
                          value={file?.yearMaster?.id || ""}
                          onChange={(e) => handleYearChangeForFile(index, e.target.value)}
                          disabled={!handleEditDocumentActive || isDisabled || status === "APPROVED"}
                          className="border rounded-lg px-2 py-1 text-sm w-24 text-center bg-gray-50"
                        >
                          <option value="">Select</option>
                          {yearOptions?.map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {/* Version */}
                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Ver:</span>
                        <input
                          type="text"
                          value={version}
                          onChange={(e) => handleVersionChange(index, e.target.value.trim())}
                          className="border rounded-lg px-2 py-1 text-sm w-20 text-center"
                          disabled={!handleEditDocumentActive || isDisabled || status === "APPROVED"}
                          placeholder="v1"
                          maxLength={10}
                        />
                      </label>
                    </div>

                    <div className="text-center">
                      <label className="flex justify-center items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium
                            ${status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : status === "REJECTED"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                        >
                          {status || "PENDING"}
                        </span>
                      </label>
                    </div>
                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openFileBeforeSubmit(file?.path, index);
                        }}
                        disabled={openingFiles === index}
                        className={`rounded-lg px-3 py-1 text-sm transition ${openingFiles === index
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-indigo-500 text-white hover:bg-indigo-600"
                          }`}
                      >
                        {openingFiles === index ? "Opening..." : "Open"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (deletingFiles !== index && status !== "APPROVED") {
                            handleDiscardFile(index);
                          }
                        }}
                        disabled={deletingFiles === index || status === "APPROVED"}
                        className={`rounded-lg px-3 py-1 text-sm transition ${deletingFiles === index || status === "APPROVED"
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                      >
                        {deletingFiles === index ? "Deleting..." : "Delete"}
                      </button>

                    </div>
                  </li>

                );
              })
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

            <div className="flex justify-between items-center">
              {uploadedFilePath !== 0 && (
                <div
                  className="text-red-800 cursor-pointer hover:underline"
                  onClick={handleDiscardAll}
                  aria-label="Discard All Files"
                >
                  Discard All
                </div>
              )}

              <div className="mt-3">
                {editingDoc === null ? (

                  <button
                    onClick={handleAddDocument}
                    disabled={bProcess}
                    className={`${bProcess ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-700"
                      } text-white focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 flex items-center text-sm`}
                    aria-label="Upload File"
                  >
                    <PlusCircleIcon className="h-5 w-5 mr-1" />
                    {bProcess ? "Uploading..." : "Upload File"}
                  </button>

                ) : (
                  <button
                    onClick={handleSaveEdit}
                    disabled={bProcess}

                    className={`${bProcess ? "bg-gray-400 cursor-not-allowed" : "bg-blue-900 hover:bg-blue-700"
                      } text-white focus:ring-2 focus:ring-blue-500 rounded-2xl p-2 flex items-center text-sm`}
                    aria-label="Update File"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-1" />
                    {bProcess ? "Updating..." : "Update File"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
            <div className="flex items-center bg-blue-500 rounded-lg">
              <label
                htmlFor="itemsPerPage"
                className="mr-2 ml-2 text-white text-sm"
              >
                Show:
              </label>
              <select
                id="itemsPerPage"
                className="border rounded-r-lg p-1.5 outline-none"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center mb-4">
              <input
                type="text"
                placeholder="Search by title, subject, or file no..."
                className="border rounded-l-md p-1 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={20}
              />
              <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
            </div>

          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left">SR.</th>
                  <th className="border p-2 text-left">File No</th>
                  <th className="border p-2 text-left">Title</th>
                  <th className="border p-2 text-left">Subject</th>
                  <th className="border p-2 text-left">Category</th>
                  {/* <th className="border p-2 text-left">File Year</th> */}
                  <th className="border p-2 text-left">Approval Status</th>
                  <th className="border p-2 text-left">Uploaded Date</th>
                  <th className="border p-2 text-left">Edit</th>
                  <th className="border p-2 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc, index) => (
                  <tr key={doc.id}>
                    <td className="border p-2">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="border p-2">{doc.fileNo}</td>
                    <td className="border p-2">{doc.title}</td>
                    <td className="border p-2">{doc.subject}</td>
                    <td className="border p-2">
                      {doc.categoryMaster
                        ? doc.categoryMaster.name
                        : "No Category"}
                    </td>
                    {/* <td className="border p-2">
                      {doc.yearMaster ? doc?.yearMaster?.name : "No year"}
                    </td> */}
                    <td className="border p-2">{doc.approvalStatus}</td>
                    <td className="border p-2">{formatDate(doc.createdOn)}</td>
                    <td className="border p-2">
                      <button onClick={() => handleEditDocument(doc)} disabled={doc.isActive === 0}
                        className={`${doc.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1 sm:text-blue-50" />
                      </button>
                    </td>
                    <td className="border p-2">
                      <button onClick={() => openModal(doc)}>
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            <div className="flex items-center mt-4">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>

              {/* Page Number Buttons */}
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

              {/* Next Button */}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                  }`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems} entries
                </span>
              </div>
            </div>


            {/* Document Details Code */}
            <>
              {isOpen && selectedDoc && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75 print-modal overflow-y-auto">
                  <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl p-4 sm:p-6 my-8 mx-4">
                    <div className="max-h-[90vh] overflow-y-auto print:overflow-visible print:max-h-none">

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
                            <strong>Uploaded Date:</strong> {formatDate(selectedDoc?.createdOn)}
                          </p>
                        </div>

                        {/* Document Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="mt-6 text-left space-y-2">
                            {[
                              { label: "Branch", value: selectedDoc?.employee?.branch?.name },
                              { label: "Department", value: selectedDoc?.employee?.department?.name },
                              { label: "File No.", value: selectedDoc?.fileNo },
                              { label: "Title", value: selectedDoc?.title },
                              { label: "Subject", value: selectedDoc?.subject },
                              {
                                label: "Category",
                                value: selectedDoc?.categoryMaster?.name || "No Category",
                              },
                              { label: "Status", value: selectedDoc?.approvalStatus },
                              { label: "Upload By", value: selectedDoc?.employee?.name },
                            ].map((item, idx) => (
                              <p key={idx} className="text-md text-gray-700">
                                <strong>{item.label} :-</strong> {item.value || "N/A"}
                              </p>
                            ))}
                          </div>

                          {/* QR Code */}
                          <div className="items-center justify-center text-center">
                            <p className="text-md text-gray-700 mt-3">
                              <strong>QR Code:</strong>
                            </p>
                            {selectedDoc?.qrPath ? (
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
                        <div className="mt-8">
                          <div className="flex justify-between items-center mb-4 relative">
                            <h2 className="text-lg font-bold text-indigo-700">Attached Files</h2>
                            <input
                              type="text"
                              placeholder="Search Files..."
                              value={searchFileTerm}
                              onChange={(e) => setSearchFileTerm(e.target.value)}
                              maxLength={20}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                            />
                          </div>

                          {loadingFiles ? (
                            <div className="flex justify-center items-center py-6">
                              <div className="w-6 h-6 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                              <span className="ml-2 text-gray-600">Loading files...</span>
                            </div>
                          ) : selectedDoc && filteredDocFiles.length > 0 ? (
                            <div className="border border-gray-200 rounded-lg shadow-sm">
                              {/* Table Header */}
                              <div className="grid grid-cols-6 bg-gray-100 text-gray-700 font-semibold text-sm px-4 py-2 sticky top-0">
                                <span className="col-span-2 text-left">File Name</span>
                                <span className="text-center">Year</span>
                                <span className="text-center">Version</span>
                                <span className="text-center">Status</span>
                                <span className="text-center no-print">Actions</span>
                              </div>

                              {/* File List */}
                              <ul
                                className={`divide-y divide-gray-200 ${printTrue === false && filteredDocFiles.length > 5
                                  ? "max-h-72 overflow-y-auto print:max-h-none print:overflow-visible"
                                  : ""
                                  }`}
                              >
                                {filteredDocFiles.map((file, index) => (
                                  <li
                                    key={index}
                                    className="grid grid-cols-6 items-center px-4 py-3 hover:bg-indigo-50 transition duration-200"
                                  >
                                    {/* File Name Full (no truncate) */}
                                    <div className="col-span-2 text-left text-gray-800 break-words">
                                      <strong>{index + 1}.</strong> {file.docName}
                                    </div>

                                    <div className="text-center text-gray-700">{file.year}</div>
                                    <div className="text-center text-gray-700">{file.version}</div>
                                    <div className="text-center">
                                      <span
                                        className={`px-2 py-1 text-xs rounded-full font-medium
                            ${file.status === "APPROVED"
                                            ? "bg-green-100 text-green-700"
                                            : file.status === "REJECTED"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-yellow-100 text-yellow-700"
                                          }`}
                                      >
                                        {file.status || "PENDING"}
                                      </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-center gap-2 no-print">
                                      <button
                                        onClick={() => {
                                          setOpeningFileIndex(index);
                                          setSelectedDocFiles(file);
                                          openFile(file).finally(() => setOpeningFileIndex(null));
                                        }}
                                        disabled={openingFileIndex !== null}
                                        className={`flex items-center gap-1 bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm shadow-sm transition duration-200
                            ${openingFileIndex === index
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:bg-indigo-600"}
                          `}
                                      >
                                        {openingFileIndex === index ? "Opening..." : "Open"}
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mt-4 text-center">
                              No attached files available.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}




              {viewFileTypeModel && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
                  <div className="w-80 sm:w-96 bg-white rounded-xl shadow-xl p-5 border border-gray-200 max-h-[80vh] overflow-y-auto transition-all">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">Supported File Types</h2>
                      <button
                        onClick={handlecloseFileType}
                        className="text-gray-400 hover:text-red-500 text-xl focus:outline-none"
                        aria-label="Close"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Search Input */}
                    <input
                      type="text"
                      placeholder="Search file type..."
                      value={searchTerm}
                      onChange={(e) => setSearchFileTerm(e.target.value)}
                      maxLength={20}
                      className="w-full p-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    {/* List */}
                    <ul className="space-y-2">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-md hover:bg-blue-50 transition text-sm"
                          >
                            <span className="text-gray-800 font-medium">{file.filetype}</span>
                            <span className="text-gray-500">{file.extension}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-center text-gray-500 text-sm">No matching file types found</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

            </>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;
