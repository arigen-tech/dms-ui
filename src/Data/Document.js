import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Search from "./Search"; // Import the Search component
import Popup from "../Components/Popup";

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
import { API_HOST, DOCUMENTHEADER_API, UPLOADFILE_API } from "../API/apiConfig";

const DocumentManagement = ({ fieldsDisabled }) => {
  const location = useLocation();
  const data = location.state;
  const [formData, setFormData] = useState({
    fileNo: "",
    title: "",
    subject: "",
    version: "",
    category: null,
    year: null,
    uploadedFilePaths: [], // To store paths of uploaded files
  });
  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [uploadedFilePath, setUploadedFilePath] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [isUploadEnabled, setIsUploadEnabled] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [userBranch, setUserBranch] = useState([]);
  const [userDep, setUserDep] = useState([]);
  const fileInputRef = useRef(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [editingDoc, setEditingDoc] = useState(null); // To hold the document being edited
  const [updatedDoc, setUpdatedDoc] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");
  const [qrPath, setQrPath] = useState("");
  const [documentDetails, setDocumentDetails] = useState(null);
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  // Run this effect only when component mounts
  useEffect(() => {
    if (data) {
      debugger;
      handleEditDocument(data);
    }
    fetchCategory();
    fetchYear();
    fetchDocuments();
    fetchPaths();
    fetchUser();
  }, []); // Add an empty dependency array to avoid infinite re-renders

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

  // Update upload button enable status based on form data
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
      const response = await axios.get(
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
      const response = await axios.get(
        `${API_HOST}/YearMaster/findActiveYear`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setYearOptions(response.data);
    } catch (error) {
      console.error("Error fetching Year:", error);
    }
  };

  const fetchUser = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
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
      const response = await axios.get(
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
    }
  };

  console.log("all doc by user", documents);

  // const fetchPaths = async (doc) => {
  //   try {
  //     const token = localStorage.getItem("tokenKey");
  //     if (!token) {
  //       throw new Error("No authentication token found.");
  //     }

  //     // More comprehensive document validation
  //     if (!doc) {
  //       console.error("Document is null or undefined");
  //       return null;
  //     }

  //     if (!doc.id) {
  //       console.error("Invalid document: No ID found", doc);
  //       return null;
  //     }

  //     // Validate doc.id is not just a falsy value
  //     const documentId = doc.id.toString().trim();
  //     if (!documentId) {
  //       console.error("Document ID is empty or invalid", doc);
  //       return null;
  //     }

  //     console.log(`Attempting to fetch paths for document ID: ${documentId}`);
  //     console.log(`Full URL: ${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`);

  //     const response = await axios.get(
  //       `${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'Content-Type': 'application/json'
  //         },
  //       }
  //     );

  //     console.log("Paths response:", response.data);

  //     setSelectedDoc((prevDoc) => ({
  //       ...prevDoc,
  //       paths: Array.isArray(response.data) ? response.data : [],
  //     }));

  //     return response.data; // Optional: return the data
  //   } catch (error) {
  //     // More detailed error logging
  //     console.error("Error in fetchPaths:", error);

  //     // More comprehensive error handling
  //     if (axios.isAxiosError(error)) {
  //       if (error.response) {
  //         console.error("Server responded with error:", {
  //           status: error.response.status,
  //           data: error.response.data
  //         });
  //       } else if (error.request) {
  //         console.error("No response received:", error.request);
  //       }
  //     }

  //     // Optional: more user-friendly error handling
  //     showPopup(`Failed to fetch document paths: ${error.message || 'Unknown error'}`);

  //     return null; // Explicitly return null on error
  //   }
  // };

  const openFile = async (file) => {
    console.log("file: ", file);

    const token = localStorage.getItem("tokenKey");

    // Replace spaces with underscores in the fields
    const branch = file.documentHeader.employee.branch.name.replace(/ /g, "_");
    const department = file.documentHeader.employee.department.name.replace(
      / /g,
      "_"
    );
    const year = file.documentHeader.yearMaster.name.replace(/ /g, "_");
    const category = file.documentHeader.categoryMaster.name.replace(/ /g, "_");
    const version = file.documentHeader.version.replace(/ /g, "_");
    const fileName = file.docName.replace(/ /g, "_");

    const fileUrl = `${API_HOST}/api/documents/download/${branch}/${department}/${year}/${category}/${version}/${fileName}`;

    try {
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      // Open the file in a new tab
      window.open(blobUrl, "_blank");

      // Revoke the blob URL after use
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      if (error.response) {
        console.error("Error response:", error.response);
        showPopup(`Error ${error.response.status}: Unable to fetch the file.`);
      } else if (error.request) {
        console.error("Error request:", error.request);
        showPopup("No response from server. Please check your connection.");
      } else {
        console.error("Error message:", error.message);
        showPopup("An unexpected error occurred.");
      }
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

  // Handle file uploads but do not save paths to the DB yet
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
      setIsUploadEnabled(true);
    } else {
      setIsUploadEnabled(false);
    }
  };

  // Handle the file upload when the "Upload" button is clicked
  const handleUploadDocument = async () => {
    if (selectedFiles.length === 0) {
      showPopup("Please select at least one file to upload.");
      return;
    }

    const uploadData = new FormData();

    // Append form data to FormData object
    uploadData.append("category", formData.category.name);
    uploadData.append("year", formData.year.name);
    uploadData.append("version", formData.version);
    uploadData.append("branch", userBranch);
    uploadData.append("department", userDep);

    // Append files
    selectedFiles.forEach((file) => {
      uploadData.append("files", file);
    });

    try {
      const response = await fetch(`${API_HOST}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });

      if (!response.ok) {
        const errorDetails = await response.text(); // Read error as plain text
        throw new Error(
          `HTTP error! Status: ${response.status}. Details: ${errorDetails}`
        );
      }

      const filePaths = await response.json();
      console.log("Files uploaded successfully:", filePaths);

      if (Array.isArray(filePaths)) {
        setFormData((prevData) => ({
          ...prevData,
          uploadedFilePaths: [
            ...(prevData.uploadedFilePaths || []),
            ...filePaths,
          ],
        }));

        setUploadedFileNames((prevNames) => [
          ...prevNames,
          ...selectedFiles.map((file) => file.name),
        ]);

        setUploadedFilePath((prevPath) => [...prevPath, ...filePaths]);

        showPopup("Files uploaded successfully!", "success");

        setSelectedFiles([]);
        setIsUploadEnabled(false);
        // Reset states
        setSelectedFiles([]);
        setIsUploadEnabled(false);

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        throw new Error("Invalid file paths returned from the server.");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      showPopup(`File upload failed: ${error.message}`, "error");
    }
  };

  // Handle adding the document
  const handleAddDocument = async () => {
    // Validate required fields and uploaded files
    if (
      !formData.fileNo ||
      !formData.title ||
      !formData.subject ||
      !formData.version ||
      !formData.category ||
      !formData.category ||
      formData.uploadedFilePaths.length === 0
    ) {
      showPopup(
        "Please fill in all the required fields and upload a file.",
        "error"
      );
      return;
    }

    // Construct the payload
    const payload = {
      documentHeader: {
        fileNo: formData.fileNo,
        title: formData.title,
        subject: formData.subject,
        version: formData.version,
        categoryMaster: { id: formData.category.id }, // Category ID from formData
        yearMaster: { id: formData.year.id },
        employee: { id: parseInt(UserId, 10) }, // Employee ID from user session
      },
      filePaths: formData.uploadedFilePaths, // Paths of uploaded files
    };

    try {
      // Send the payload to the backend
      const response = await fetch(`${API_HOST}/api/documents/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Include the authorization token
        },
        body: JSON.stringify(payload), // Convert payload to JSON
      });

      // Check if the response is successful
      if (!response.ok) {
        const errorDetails = await response.text(); // Get error details from the response
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorDetails}`
        );
      }

      // If successful, reset the form and reload documents
      showPopup("Document saved successfully!", "success");

      // Reset the form data
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
      setUploadedFileNames([]); // Clear file names
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error("Error saving document:", error);
      showPopup(`Document save failed`, "error");
    }
  };

  const fetchPaths = async (doc) => {
    try {
      const token = localStorage.getItem("tokenKey");
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

      const response = await axios.get(
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

  const handleEditDocument = (doc) => {
    console.log("Editing document:", doc);
    setEditingDoc(doc);

    // Prepare the existing file details for editing
    const existingFiles = (doc.documentDetails || []).map((detail) => ({
      name: detail.path.substring(detail.path.lastIndexOf("/") + 1),
      path: detail.path,
      isExisting: true, // Mark these as pre-existing files
    }));

    setFormData({
      fileNo: doc.fileNo,
      title: doc.title,
      subject: doc.subject,
      version: doc.version,
      category: doc.categoryMaster || null,
      year: doc.yearMaster || null,
    });

    // Set uploaded file names and paths to show existing files
    setUploadedFileNames(existingFiles.map((file) => file.name));
    setUploadedFilePath(existingFiles.map((file) => file.path));
  };

  const handleSaveEdit = async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("tokenKey");

    if (!userId || !token) {
      showPopup("User not logged in. Please log in again.", "error");
      return;
    }

    // Combine uploaded files with existing file paths
    const combinedFilePaths = [
      ...uploadedFilePath,
      //...editingDoc.documentDetails.map((detail) => detail.path), // Existing file paths
    ];
    // debugger;
    // Prepare the payload for the API
    const payload = {
      documentHeader: {
        id: editingDoc.id,
        fileNo: formData.fileNo,
        title: formData.title,
        subject: formData.subject,
        version: formData.version,
        categoryMaster: { id: formData.category?.id },
        yearMaster: { id: formData.year?.id },
        employee: { id: parseInt(userId, 10) },
      },
      filePaths: combinedFilePaths, // All file paths (new + existing)
    };

    console.log("Payload for update:", payload);

    try {
      const response = await fetch(`${API_HOST}/api/documents/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        const errorMessage = contentType?.includes("application/json")
          ? (await response.json()).message
          : await response.text();
        throw new Error(
          errorMessage || `HTTP error! Status: ${response.status}`
        );
      }

      const updatedDocument = await response.json();
      console.log("Document updated successfully:", updatedDocument);
      showPopup("Document updated successfully!", "success");

      // Reset form and refresh the document list
      setFormData({
        fileNo: "",
        title: "",
        subject: "",
        version: "",
        category: null,
        year: null,
      });
      setUploadedFileNames([]);
      setUploadedFilePath([]);
      setEditingDoc(null);
      fetchDocuments(); // Refresh the document list after update
    } catch (error) {
      console.error("Error updating document:", error);
      showPopup(`Document update failed: ${error.message}`, "error");
    }
  };

  const handleDiscardFile = (index) => {
    // debugger;
    if (index < 0 || index >= uploadedFileNames.length) {
      console.error("Invalid index:", index);
      return;
    }

    // For editing an existing document
    if (editingDoc) {
      // First, check if it's an existing document file or a new upload
      const isExistingFile = index < editingDoc.documentDetails.length;

      if (isExistingFile) {
        // Remove the existing file from the display
        const updatedFileNames = uploadedFileNames.filter(
          (_, i) => i !== index
        );
        const updatedFilePath = uploadedFilePath.filter((_, i) => i !== index);
        setUploadedFilePath(updatedFilePath);
        setUploadedFileNames(updatedFileNames);

        // Optional: You might want to track which existing files are to be removed
        // This could be done by adding a flag or separate state
      } else {
        // If it's a newly uploaded file during edit
        const newUploadIndex = index - editingDoc.documentDetails.length;
        const updatedFileNames = uploadedFileNames.filter(
          (_, i) => i !== index
        );
        const updatedPaths = formData.uploadedFilePaths.filter(
          (_, i) => i !== newUploadIndex
        );

        setUploadedFileNames(updatedFileNames);
        setFormData({ ...formData, uploadedFilePaths: updatedPaths });
      }
    }
    // For new document upload (same as before)
    else {
      const updatedFiles = uploadedFileNames.filter((_, i) => i !== index);
      const updatedPaths = formData.uploadedFilePaths.filter(
        (_, i) => i !== index
      );

      setUploadedFileNames(updatedFiles);
      setFormData({ ...formData, uploadedFilePaths: updatedPaths });
    }
  };

  // Handle discard all files
  const handleDiscardAll = () => {
    setUploadedFileNames([]);
    setUploadedFilePath([]);
    setFormData({ ...formData, uploadedFilePaths: [] });
  };

  const openModal = (doc) => {
    setSelectedDoc(doc); // Set the selected document without paths first
    fetchPaths(doc); // Fetch paths and update the selected document with paths
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc(null);
  };

  const printPage = () => {
    window.print();
  };

  const showPopup = (message, type = "info") => {
    setPopupMessage({ message, type });
  };

 
  useEffect(() => {
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id);
    }
  }, [selectedDoc]); 

  const fetchQRCode = async (documentId) => {
    try {
       if (!token) {
        throw new Error('Authentication token is missing');
      }

      // API URL to fetch the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,  // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }

      const qrCodeBlob = await response.blob();

      console.log('Fetched QR code Blob:', qrCodeBlob);

      if (!qrCodeBlob.type.includes('image/png')) {
        throw new Error('Received data is not a valid image');
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      setQrCodeUrl(qrCodeUrl); 

    } catch (error) {
      setError('Error displaying QR Code: ' + error.message);
    }
  };

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert('Please enter a document ID');
      return;
    }

    try {

      if (!token) {
        throw new Error('Authentication token is missing');
      }

      // API URL to download the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`;

      // Fetch the QR code as a Blob (binary data) with the token in the Authorization header
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,  // Add the token to the header
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }

      const qrCodeBlob = await response.blob();
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob);

      // Create an anchor link to trigger the download
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR_Code_${selectedDoc.id}.png`; // Set a default name for the file
      link.click();

      // Clean up URL object
      window.URL.revokeObjectURL(qrCodeUrl);

    } catch (error) {
      setError('Error downloading QR Code: ' + error.message);
    } finally {
      // setLoading(false);
    }
  };

  
  // const handleSearchResults = (results) => {
  //   setSearchResults(results);
  //   setCurrentPage(1); // Reset to first page when new search results come in
  // };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedDocuments = documents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">DOCUMENT MANAGEMENT</h1>
      {/* Add the Search component
       <Search onSearchResults={handleSearchResults} /> */}

      <div className="bg-white p-3 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            {/* File No Input */}
            <label className="block text-md font-medium text-gray-700">
              File No.
              <input
                type="text"
                placeholder="File No."
                name="fileNo"
                value={formData.fileNo}
                onChange={(e) =>
                  setFormData({ ...formData, fileNo: e.target.value })
                }
                disabled={fieldsDisabled}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                disabled={fieldsDisabled}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                disabled={fieldsDisabled}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {/* Version Input */}
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
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {/* Category Select */}
            <label className="block text-md font-medium text-gray-700">
              Category
              <select
                name="category"
                value={formData.category?.id || ""}
                onChange={handleCategoryChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-md font-medium text-gray-700">
              Year
              <select
                name="year"
                value={formData.year?.id || ""}
                onChange={handleYearChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Year</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>

            {/* File Upload Section */}
            <label className="block text-md font-medium text-gray-700">
              Upload Files
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=""
                  multiple
                  onChange={handleFileChange}
                  className="mt-1 block w-full p-3 border rounded-md outline-none"
                />
                <button
                  onClick={handleUploadDocument} // Upload files when clicked
                  disabled={!isUploadEnabled} // Disable button if no files are selected
                  className={`ml-2 text-white rounded-xl p-2 ${
                    isUploadEnabled ? "bg-blue-900" : "bg-gray-400"
                  }`}
                >
                  Upload
                </button>
              </div>
            </label>
          </div>

          {/* Add Document Button */}
          <div className="mt-3 flex justify-start">
            {editingDoc === null ? (
              <button
                onClick={handleAddDocument}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Document
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
              </button>
            )}
          </div>

          {/* Display Uploaded File Names */}
          {uploadedFileNames.length > 0 && (
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex flex-wrap gap-4">
                {uploadedFileNames.map((fileName, index) => {
                  // Extract the part after the first underscore
                  const displayName = fileName.substring(
                    fileName.indexOf("_") + 1
                  );

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <span>{displayName}</span>
                      <button
                        onClick={() => handleDiscardFile(index)}
                        className="text-red-500"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <button className="mt-4 text-red-500" onClick={handleDiscardAll}>
                Discard All
              </button>
            </div>
          )}
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
                setItemsPerPage(Number(e.target.value)); // Update items per page
                setCurrentPage(1); // Reset to the first page
              }}
            >
              {[5, 10, 15, 20].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <th className="border p-2 text-left">Version</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">File Year</th>
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
                  <td className="border p-2">{doc.version}</td>
                  <td className="border p-2">
                    {doc.categoryMaster
                      ? doc.categoryMaster.name
                      : "No Category"}
                  </td>
                  <td className="border p-2">
                    {doc.yearMaster ? doc.yearMaster.name : "No year"}
                  </td>
                  <td className="border p-2">{doc.approvalStatus}</td>
                  <td className="border p-2">{formatDate(doc.createdOn)}</td>
                  <td className="border p-2">
                    <button onClick={() => handleEditDocument(doc)}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
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
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                {totalItems} entries
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-slate-200 px-3 py-1 rounded mr-3"
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="bg-slate-200 px-3 py-1 rounded ml-3"
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
            </div>
          </div>

          <>
            {isOpen && selectedDoc && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75 print-modal">
                <div className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full p-6">
                  {/* Print Button */}
                  <button
                    className="absolute top-4 right-16 text-gray-500 mb-4 hover:text-gray-700 no-print"
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
                    <div className="flex justify-between items-center border-b-2 border-gray-300 pb-4">
                      <div className="flex items-center space-x-2">
                        <p className="text-lg font-extrabold text-indigo-600 border-b-4 border-indigo-600">
                          D
                        </p>
                        <p className="text-lg font-extrabold text-indigo-600 border-t-4 border-indigo-600">
                          MS
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Uploaded Date:</strong>{" "}
                        {formatDate(selectedDoc?.createdOn)}
                      </p>
                    </div>

                    {/* Document Details */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="mt-4 text-left">
                        <p className="text-md text-gray-700">
                          <strong>Branch :-</strong>{" "}
                          {selectedDoc?.employee?.branch?.name || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Department :-</strong>{" "}
                          {selectedDoc?.employee?.department?.name || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>File No. :-</strong>{" "}
                          {selectedDoc?.fileNo || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Title :-</strong>{" "}
                          {selectedDoc?.title || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Subject :-</strong>{" "}
                          {selectedDoc?.subject || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Version :-</strong>{" "}
                          {selectedDoc?.version || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Category :-</strong>{" "}
                          {selectedDoc?.categoryMaster?.name || "No Category"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>File Year :-</strong>{" "}
                          {selectedDoc?.yearMaster?.name || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Status :-</strong>{" "}
                          {selectedDoc?.approvalStatus || "N/A"}
                        </p>
                        <p className="text-md text-gray-700">
                          <strong>Upload By :-</strong>{" "}
                          {selectedDoc?.employee?.name || "N/A"}
                        </p>
                      </div>
                      <div className="items-center justify-center z-50">
                        <p className="text-md text-center text-gray-700 mt-3">
                          <strong>QR Code:</strong>
                        </p>
                        {selectedDoc?.qrPath ? (
                          <div className="mt-4 text-center">
                            {/* Display the QR code image */}
                            <img
                              src={qrCodeUrl}
                              alt="QR Code"
                              className="mx-auto w-full h-full object-contain border border-gray-300 p-2"
                            />
                            
                            {/* Download the QR code */}
                            <button
                              onClick={downloadQRCode}
                              className="mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 no-print"
                            >
                              Download
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center">
                            No QR code available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attached Files */}
                    <div className="mt-6 text-center">
                      <h2 className="text-lg font-semibold text-indigo-700">
                        Attached Files
                      </h2>
                      {Array.isArray(selectedDoc.paths) &&
                      selectedDoc.paths.length > 0 ? (
                        <ul className="list-disc list-inside text-left mt-2">
                          {selectedDoc.paths.map((file, index) => {
                            // Extract the display name by removing the timestamp and retaining the rest
                            const displayName = file.docName.includes("_")
                              ? file.docName.split("_").slice(1).join("_")
                              : file.docName;

                            return (
                              <li key={index} className="mb-2">
                                <span className="mr-4 text-gray-600">
                                  <strong>{index + 1}</strong>{" "}
                                  {/* Removed the dot after the index */}{" "}
                                  {displayName}
                                </span>
                                <button
                                  onClick={() => openFile(file)}
                                  className="bg-indigo-500 text-white px-3 py-1 rounded shadow-md hover:bg-indigo-600 transition no-print"
                                >
                                  Open
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
                </div>
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;
