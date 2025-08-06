import { YEAR_API } from '../API/apiConfig';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon,
  PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Popup from '../Components/Popup';
import LoadingComponent from '../Components/LoadingComponent';

const tokenKey = 'tokenKey';

const Year = () => {
  const [years, setYears] = useState([]);
  const [formData, setFormData] = useState({ year: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [yearToToggle, setYearToToggle] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a ref for the form section
  const formRef = useRef(null);

  useEffect(() => {
    // Fetch years from the server
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem(tokenKey);
      const response = await axios.get(`${YEAR_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYears(response.data);
    } catch (error) {
      console.error('Error fetching years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'year') {
      if (/^\d{0,4}$/.test(value)) {
        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
      }
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleAddYear = async () => {
    if (formData.year) {
      const newYear = { name: formData.year };

      try {
        const token = localStorage.getItem(tokenKey);
        const response = await axios.post(`${YEAR_API}/save`, newYear, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYears([...years, response.data]);
        setFormData({ year: '' });
        showPopup("Year added successfully!", "success");
      } catch (error) {
        const message = error.response?.data?.message || "Failed to add year.";
        showPopup(message, "error");
        console.error('Error adding year:', message);
      }
    }
  };

  const handleEditYear = (selectedYear) => {
    const indexInOriginal = years.findIndex(y => y.id === selectedYear.id);
    if (indexInOriginal !== -1) {
      setEditingIndex(indexInOriginal);
      setFormData({ year: selectedYear.name });
      // Scroll to form after setting the edit state
      scrollToForm();
    }
  };

  const handleSaveEdit = async () => {
    if (formData.year && editingIndex !== null) {
      try {
        const updatedYear = {
          ...years[editingIndex],
          name: formData.year,
          updatedOn: new Date().toISOString(),
        };
        const token = localStorage.getItem(tokenKey);
        await axios.put(`${YEAR_API}/update/${updatedYear.id}`, updatedYear, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYears(years.map((year, index) =>
          index === editingIndex ? updatedYear : year
        ));
        setFormData({ year: '' });
        setEditingIndex(null);
        showPopup('Year updated successfully!', "success");
      } catch (error) {
        const message = error.response?.data?.message || "Failed to update year.";
        showPopup(message, "error");
        console.error('Error updating year:', message);
      }
    }
  };

  const handleToggleActiveStatus = (year) => {
    setYearToToggle(year);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
    setIsConfirmDisabled(true);

    if (yearToToggle) {
      try {
        const updatedYear = {
          ...yearToToggle,
          isActive: yearToToggle.isActive === 1 ? 0 : 1, // Toggle between 1 and 0
          updatedOn: new Date().toISOString(),
        };

        const token = localStorage.getItem(tokenKey); // Retrieve token from local storage
        const response = await axios.put(
          `${YEAR_API}/updatestatus/${updatedYear.id}`, // Update API endpoint
          updatedYear,
          {
            headers: {
              'Content-Year': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedYears = years.map(year =>
          year.id === updatedYear.id ? response.data : year
        );
        setYears(updatedYears);
        setModalVisible(false);
        setIsConfirmDisabled(false);
        setYearToToggle(null);
        showPopup('Status Changed successfully!');
      } catch (error) {
        console.error('Error toggling Year status:', error.response ? error.response.data : error.message);
        showPopup('Failed to changing the status. Please try again.');
      }
    } else {
      console.error('No Year selected for status toggle');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
  };

  const filteredYears = years.filter(year => {
    const statusText = year.isActive === 1 ? 'active' : 'inactive';
    const createdOnText = formatDate(year.createdOn);
    const updatedOnText = formatDate(year.updatedOn);

    return (
      (year.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });

  const sortedYears = filteredYears.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedYears.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedYears = sortedYears.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-lg mb-1 font-semibold">Years</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}
        
        {/* Add ref to the form section */}
        <div ref={formRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6 ">
            <div className="flex w-1/2 gap-6">
              <label htmlFor="year" className="w-full block text-md font-medium text-gray-700 flex-1">
                Enter Year <span className="text-red-500">*</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="2000 - 2050"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div className=" flex items-end">
                {editingIndex === null ? (
                  <button onClick={handleAddYear}
                    className="bg-blue-900 text-white rounded-2xl p-2 mb-1 text-sm flex items-center justify-center">
                    <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Year
                  </button>
                ) : (
                  <button onClick={handleSaveEdit}
                    className="bg-blue-900 text-white rounded-2xl p-2 text-sm flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 bg-slate-100 px-3 py-2 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Year</th>
                <th className="border p-2 text-left">Created On</th>
                <th className="border p-2 text-left">Updated On</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {paginatedYears.map((year, index) => (
                <tr key={year.id}>
                  <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="border p-2">{year.name}</td>
                  <td className="border px-4 py-2">{formatDate(year.createdOn)}</td>
                  <td className="border px-4 py-2">{formatDate(year.updatedOn)}</td>
                  <td className="border p-2">{year.isActive === 1 ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleEditYear(year)}
                      disabled={year.isActive === 0}
                      className={`${year.isActive === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleToggleActiveStatus(year)}
                      className={`p-1 rounded-full ${year.isActive === 1 ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {year.isActive === 1 ? (
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

        {/* Pagination Controls */}
        <div className="flex items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || totalPages === 0}
            className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
              }`}
          >
            <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
            Previous
          </button>

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

          <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

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
      </div>

      {modalVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Confirm Status Change</h2>
            <p>Are you sure you want to {yearToToggle?.isActive === 1 ? 'deactivate' : 'activate'} the year <strong>{yearToToggle.year}</strong>?</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalVisible(false)}
                className="bg-gray-300 text-gray-800 rounded-lg px-4 py-2 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleActiveStatus}
                disabled={isConfirmDisabled}
                className={`bg-blue-500 text-white rounded-md px-4 py-2 ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isConfirmDisabled ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Year;