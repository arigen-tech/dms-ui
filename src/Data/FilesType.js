import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon
} from '@heroicons/react/24/solid';
import { FILETYPE_API } from '../API/apiConfig';
import Popup from '../Components/Popup';

const tokenKey = 'tokenKey';

const FilesType = () => {
  const [filesType, setFilesType] = useState([]);
  const [formData, setFormData] = useState({
    filetype: '',
    extension: '',
    isActive: 1,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [fileTypeToToggle, setFileTypeToToggle] = useState(null);
  const [editingFileTypeId, seteditingFileTypeId] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const [popupMessage, setPopupMessage] = useState(null);

  const token = localStorage.getItem('tokenKey');

  useEffect(() => {
    fetchFilesType();
  }, []);

  console.log(filesType);

  const fetchFilesType = async () => {
    try {
      const response = await axios.get(`${FILETYPE_API}/getAll`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setFilesType(response?.data?.response);
    } catch (error) {
      console.error('Error fetching Files Types:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddFileType = async () => {
    if (formData.filetype && formData.extension) {
      try {
        const newFileType = {
          ...formData,
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
          isActive: formData.isActive ? 1 : 0,
        };

        const response = await axios.post(`${FILETYPE_API}/create`, newFileType, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        setFilesType([...filesType, response.data]);
        setFormData({ filetype: '', extension: '', isActive: true });

        showPopup('FileType added successfully!', "success");
        fetchFilesType();
      } catch (error) {
        console.error('Error adding FileType:', error.response ? error.response.data : error.message);

        showPopup(error.response.data, "error");

      }
    } else {
      showPopup('Please fill in all required fields.!', "warning");

    }


  };

  const handleEditFileType = (fileTypeId) => {
    seteditingFileTypeId(fileTypeId);

    const fileTypeToEdit = filesType.find(fileType => fileType.id === fileTypeId);

    if (fileTypeToEdit) {
      setFormData({
        filetype: fileTypeToEdit.filetype,
        extension: fileTypeToEdit.extension,
        isActive: fileTypeToEdit.isActive === 1,
        id: fileTypeToEdit.id,
      });
    } else {
      console.error('FileType not found for ID:', fileTypeId);
    }
  };

  const handleSaveEdit = async () => {
    if (formData.extension.trim() && editingFileTypeId !== null) {
      try {
        const fileTypeIndex = filesType.findIndex(fileType => fileType.id === editingFileTypeId);

        if (fileTypeIndex === -1) {
          setMessage('FileType not found!');
          setMessageType('error');
          setTimeout(() => setMessage(null), 3000);
          return;
        }

        const updatedFileType = {
          ...filesType[fileTypeIndex],
          filetype: formData.filetype,
          extension: formData.extension,
          isActive: formData.isActive ? 1 : 0,
          updatedOn: new Date().toISOString(),
        };

        const response = await axios.put(`${FILETYPE_API}/updateById/${updatedFileType.id}`, updatedFileType, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(tokenKey)}`,
          },
        });

        const updatedFileTypes = filesType?.map(branch =>
          branch.id === updatedFileType.id ? response.data : branch
        );

        setFilesType(updatedFileTypes);
        setFormData({ filetype: '', extension: '', isActive: 1 });
        seteditingFileTypeId(null);
        fetchFilesType();
        showPopup('File Type updated successfully!', "success");
      } catch (error) {
        console.error('Error updating File Type:', error.response ? error.response.data : error.message);

        showPopup('Failed to update the File Type. Please try again.!', "error");

      }


    }
  };

  const handleToggleActiveStatus = (branch) => {
    setFileTypeToToggle(branch);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    if (fileTypeToToggle) {
      try {
        const updatedFilesType = {
          ...fileTypeToToggle,
          status: fileTypeToToggle.isActive === 1 ? 0 : 1, // Toggle between 1 and 0
          updatedOn: new Date().toISOString(),
        };

        const response = await axios.put(
          `${FILETYPE_API}/update/status/${updatedFilesType.id}?status=${updatedFilesType.status}`, // Send status as query param
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedFilesTypes = filesType?.map(filesTypes =>
          filesTypes.id === updatedFilesType.id ? response.data : filesTypes
        );

        setFilesType(updatedFilesTypes);
        setModalVisible(false);
        setFileTypeToToggle(null);

        fetchFilesType();
        showPopup('Status changed successfully!', "success");

      } catch (error) {
        console.error('Error toggling branch status:', error.response ? error.response.data : error.message);

        // Show error message
        showPopup('Failed to change the status. Please try again!', "error");

      }

      // Clear the message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      console.error('No Branch selected for status toggle');
      showPopup('No branch selected for status toggle.!', "error");
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null);
      }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // hour12: true 
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const filteredFilesType = filesType?.filter(fileTypes => {
    const statusText = fileTypes?.isActive ? '1' : '0';
    const createdOnText = formatDate(fileTypes.createdOn);
    const updatedOnText = formatDate(fileTypes.updatedOn);

    return (
      fileTypes?.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fileTypes?.extension?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });


  const sortedfile = filteredFilesType?.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedfile?.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedFiles = sortedfile?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };


  return (
    <div className="p-4">
      <h1 className="text-xl mb-4 font-semibold">FileTypes</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">

        {/* Popup Messages */}
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Name Input */}
            <label className="block text-md font-medium text-gray-700">
              File Types
              <input
                type="text"
                placeholder="Enter File Types"
                name="filetype"
                value={formData.filetype || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {/* Address Input */}
            <label className="block text-md font-medium text-gray-700">
              Extension
              <input
                type="extension"
                placeholder="Enter extension"
                name="extension"
                value={formData.extension || ""}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="mt-3 flex justify-start">
            {editingFileTypeId === null ? (
              <button onClick={handleAddFileType} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add FileType
              </button>
            ) : (
              <button onClick={handleSaveEdit} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
              </button>
            )}
          </div>
        </div>

        {/* Search and Items Per Page Section */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Items Per Page (50%) */}
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label
              htmlFor="itemsPerPage"
              className="mr-2 ml-2 text-white text-sm"
            >
              Show:
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none w-full"
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

          {/* Search Input (Remaining Space) */}
          <div className="flex items-center w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Search..."
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        {/* Branches Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">File Types</th>
                <th className="border p-2 text-left">Extension</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles?.map((fileType, index) => (
                <tr key={fileType.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{fileType.filetype}</td>
                  <td className="border p-2">{fileType.extension}</td>
                  <td className="border p-2">{formatDate(fileType.createdOn)}</td>
                  <td className="border p-2">{formatDate(fileType.updatedOn)}</td>
                  <td className="border p-2">{fileType.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2 text-center">
                    <button onClick={() => handleEditFileType(fileType.id)} disabled={fileType.isActive === 0}
                      className={`${fileType.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleActiveStatus(fileType)}
                      className={`p-1 rounded-full ${fileType.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {fileType.isActive ? (
                        <LockOpenIcon className="h-5 w-5 text-white p-0.5" />
                      ) : (
                        <LockClosedIcon className="h-5 w-5 text-white p-0.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Pagination */}
        <div className="flex items-center mt-4">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

          {/* Page Number Buttons */}
          {getPageNumbers()?.map((page) => (
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
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            Next
            <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
          </button>
          <div className="ml-4">
            <span className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
              {totalItems} entries
            </span>
          </div>
        </div>
      </div>

      {/* Toggle Active Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">Are you sure you want to {fileTypeToToggle.isActive ? 'deactivate' : 'activate'} this branch<strong>{fileTypeToToggle.name}</strong>?</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">Cancel</button>
              <button onClick={confirmToggleActiveStatus} className="bg-blue-500 text-white p-2 rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesType;
