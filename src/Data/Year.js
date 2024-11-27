import { YEAR_API } from '../API/apiConfig';
import {
  ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, PencilIcon,
  PlusCircleIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/solid';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    // Fetch years from the server
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const token = localStorage.getItem(tokenKey);
      const response = await axios.get(`${YEAR_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYears(response.data);
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validate length for the year input
    if (name === 'year' && (value.length > 4)) {
      return; // Prevent setting the state if length exceeds 4
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };


  const handleAddYear = async () => {
    if (formData.year) {
      const newYear = {
        name: formData.year,
      };

      try {
        const token = localStorage.getItem(tokenKey);
        const response = await axios.post(`${YEAR_API}/save`, newYear, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setYears([...years, response.data]); 
        setFormData({ year: '' }); // Reset the form field
        alert('Year added successfully!');
      } catch (error) {
        console.error('Error adding year:', error.response ? error.response.data : error.message);
        alert('Failed to adding the year. Please try again.'); 
      }
    }
  };

  const handleEditYear = (index) => {
    setEditingIndex(index);
    setFormData({ year: years[index].name });
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
        alert('Year updated successfully!');
      } catch (error) {
        console.error('Error updating year:', error.response ? error.response.data : error.message);
        alert('Failed to update the year. Please try again.'); 
      }
    }
  };

  const handleToggleActiveStatus = (year) => {
    setYearToToggle(year);
    setModalVisible(true);
  };

  const confirmToggleActiveStatus = async () => {
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
        setYearToToggle(null);
        alert('Status Changed successfully!');
      } catch (error) {
        console.error('Error toggling Year status:', error.response ? error.response.data : error.message);
        alert('Failed to changing the status. Please try again.');
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
      // hour12: true 
    };
    return date.toLocaleString('en-GB', options).replace(',', '');
  };

  const filteredYears = years.filter(year => {
    const statusText = year.isActive === 1 ? 'active' : 'inactive';
    const createdOnText = formatDate(year.createdOn);
    const updatedOnText = formatDate(year.updatedOn);

    return (
      (year.year && year.year.toLowerCase().includes(searchTerm.toLowerCase())) ||
      statusText.includes(searchTerm.toLowerCase()) ||
      createdOnText.includes(searchTerm.toLowerCase()) ||
      updatedOnText.includes(searchTerm.toLowerCase())
    );
  });


  const sortedYears = filteredYears.sort((a, b) => b.isActive - a.isActive);

  const totalItems = sortedYears.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedYears = sortedYears.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">YEARS</h1>
      <div className="bg-white p-3 rounded-lg shadow-sm">
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              min="1900"
              max="2099"
              step="1"
              placeholder="2016"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              className="p-2 border rounded-md outline-none"
            />

          </div>
          <div className="mt-3 flex justify-start">
            {editingIndex === null ? (
              <button onClick={handleAddYear} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Year
              </button>
            ) : (
              <button onClick={handleSaveEdit} className="bg-blue-900 text-white rounded-2xl p-2 flex items-center text-sm justify-center">
                <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
          <div className="flex items-center bg-blue-500 rounded-lg">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">Show:</label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map(num => (
                <option key={num} value={num}>{num}</option>
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
                    <button onClick={() => handleEditYear(index)}>
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

        <div className="flex justify-between items-center mt-4">
          <div>
            <span className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-slate-200 px-3 py-1 rounded ml-3"
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
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
                className="bg-blue-500 text-white rounded-lg px-4 py-2"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Year;
