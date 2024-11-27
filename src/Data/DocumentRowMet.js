import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PencilIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

const DocumentManagement = () => {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    version: "",
    category: null,
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePaths, setFilePaths] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [fieldsDisabled, setFieldsDisabled] = useState(false);
  const [isUploadEnabled, setIsUploadEnabled] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalItems, setTotalItems] = useState(0);

  const token = localStorage.getItem("tokenKey");
  const UserId = localStorage.getItem("userId");

  useEffect(() => {
    const { title, subject, category } = formData;
    const isFormFilled =
      title && subject && category && selectedFiles.length > 0;
    setIsUploadEnabled(isFormFilled);
  }, [formData, selectedFiles]);

  useEffect(() => {
    fetchCategory();
    fetchDocuments();
  }, []);

  const fetchCategory = async () => {
    try {
      const response = await axios.get(
        `${ API_HOST }/CategoryMaster/findAll`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCategoryOptions(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(
        `${ API_HOST }/api/documents/pending/employee/${UserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      console.log(response.data);  // Check if categoryMaster is populated correctly
      setDocuments(response.data);
      setTotalItems(response.data.length);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };
  
  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const regex = /^[A-Za-z\s]*$/;

    if (regex.test(value) || value === "") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => file.type === "application/pdf");
    if (validFiles.length !== files.length) {
      alert("Only PDF files are allowed.");
    }
    setSelectedFiles(validFiles);
    setFilePaths(validFiles.map((file) => file.name));
  };

  const handleDiscardAll = () => {
    setUploadedFileNames([]);
    setFieldsDisabled(false);
  };

  const handleDiscardFile = (index) => {
    const updatedFileNames = [...uploadedFileNames];
    updatedFileNames.splice(index, 1);
    setUploadedFileNames(updatedFileNames);

    if (updatedFileNames.length === 0) {
      setFieldsDisabled(false);
    }
  };

  const handleViewClick = (file) => {
    const fileUrl = URL.createObjectURL(file);
    window.open(fileUrl, "_blank");
  };

  const handleAddDocument = async () => {
    try {
      const response = await axios.post(
        `${ API_HOST }/api/documents/save`,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Document added successfully:", response.data);
    } catch (error) {
      console.error("Error adding document:", error);
    }
  };

  const handleEditDocument = (index) => {
    setEditingIndex(index);
    setFormData(documents[index]);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(
        `${ API_HOST }/api/documents/update/${formData.id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("Document updated successfully");
    } catch (error) {
      console.error("Error updating document:", error);
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

  const paginatedDocuments = documents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">DOCUMENT MANAGEMENT</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
              className="p-2 border rounded-md outline-none"
            />
            <input
              type="text"
              placeholder="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
              className="p-2 border rounded-md outline-none"
            />
            <input
              type="text"
              placeholder="Version"
              name="version"
              value={formData.version}
              onChange={handleInputChange}
              disabled={fieldsDisabled}
              className="p-2 border rounded-md outline-none"
            />
            <select
              name="category"
              value={formData.category?.id || ""}
              onChange={(e) => {
                const selectedCategory = categoryOptions.find(
                  (cat) => cat.id === parseInt(e.target.value)
                );
                setFormData({ ...formData, category: selectedCategory });
              }}
              disabled={fieldsDisabled}
              className="p-2 border rounded-md outline-none"
            >
              <option value="">Select Category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div>
              <div className="flex">
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  className="p-2 border rounded-md outline-none w-full"
                />
                <button
                  onClick={() => handleAddDocument()}
                  disabled={!isUploadEnabled}
                  className={`ml-2 text-white rounded-xl p-2 ${
                    isUploadEnabled ? "bg-blue-900" : "bg-gray-400"
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-start">
            {editingIndex === null ? (
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
        </div>

        <>
          {uploadedFileNames.length > 0 && (
            <div className="p-4 bg-slate-100 rounded-lg">
              <div className="flex flex-wrap gap-4">
                {uploadedFileNames.map((fileName, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem",
                      borderRadius: "0.25rem",
                      border: "1px solid #e2e8f0",
                      // ...getFileStyle(fileName), // Apply the style based on filename
                    }}
                  >
                    <span className="mr-4">{fileName}</span>
                    <button
                      style={{
                        color: "#ef4444",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                      }}
                      onClick={() => handleDiscardFile(index)}
                    >
                      <XMarkIcon
                        style={{ width: "1.25rem", height: "1.25rem" }}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-red-500" onClick={handleDiscardAll}>
                Discard All
              </button>
            </div>
          )}
        </>

        <div className="my-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
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
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
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
              placeholder="Search"
              className="p-2 border rounded-l-lg outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">File No</th>
                <th className="border p-2 text-left">Title</th>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 text-left">Version</th>
                <th className="border p-2 text-left">Category</th>
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
                    {doc.categoryMaster ? doc.categoryMaster.name : ""}
                  </td>
                  <td className="border p-2">
                    {doc.approvalStatus}
                  </td>
                  <td className="border px-4 py-2">{formatDate(doc.createdOn)}</td>
                  <td className="border p-2">
                    <button
                      onClick={() =>
                        handleEditDocument(
                          documents.findIndex((d) => d.id === doc.id)
                        )
                      }
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button>
                      <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              entries
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
            <span className="text-blue-500 font-semibold">
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
        </div> */}
        {/* {isModalOpen && selectedDocument && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 p-4">
            <div className="bg-white p-6 rounded-lg max-w-3xl w-full mx-auto relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 p-1 rounded-full text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-semibold mb-4">File Preview</h2>
              <div className="mb-4">
                <p className="font-medium">
                  File No: {selectedDocument.fileNo}
                </p>
                <p className="font-medium">Title: {selectedDocument.title}</p>
                <p className="font-medium">
                  Subject: {selectedDocument.subject}
                </p>
                <p className="font-medium">
                  Version: {selectedDocument.version}
                </p>
                <div className="mt-4">
                  {selectedDocument.file && selectedDocument.file.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        Uploaded Files:
                      </h3>
                      <ul className="space-y-2">
                        {selectedDocument.file.map((file, index) => (
                          <li
                            key={index}
                            className="flex justify-between items-center border-b pb-2"
                          >
                            <span className="truncate">{file.name}</span>
                            <button
                              className="bg-blue-500 text-white px-3 py-1 rounded flex items-center space-x-1"
                              onClick={() => handleViewClick(file)}
                            >
                              <EyeIcon className="h-5 w-5" />
                              <span>View</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No files uploaded.</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-red-500 text-white px-4 py-2 rounded mt-4"
              >
                Close
              </button>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default DocumentManagement;
