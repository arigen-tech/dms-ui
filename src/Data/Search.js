import React, { useState, useEffect } from 'react';
import { API_HOST } from '../API/apiConfig';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  EyeIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import { DOCUMENTHEADER_API } from '../API/apiConfig';
import { YEAR_API } from '../API/apiConfig';
import Popup from '../Components/Popup';

const Search = () => {
  const [searchCriteria, setSearchCriteria] = useState({
    fileNo: '',
    title: '',
    subject: '',
    version: '',
    category: '',
    branch: '',
    year: '',
    department: '',
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] });
  const [userBranch, setUserBranch] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  let [userRole, setUserRole] = useState(null);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const [yearOptions, setYearOptions] = useState([]);
  const [popupMessage, setPopupMessage] = useState(null);

  // Pagination state
  const [itemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUserDetails();
    fetchCategories();
    fetchBranches();
    fetchYears();
  }, []);

  useEffect(() => {
    if (userBranch?.id) {
      setSearchCriteria((prevCriteria) => ({
        ...prevCriteria,
        branch: userBranch.id,
      }));
      fetchDepartments(userBranch.id);
    }
  }, [userBranch]);

  useEffect(() => {
    if (searchCriteria.branch) {
      fetchDepartments(searchCriteria.branch);
    } else {
      setDepartmentOptions([]);
    }
  }, [searchCriteria.branch]);

  const fetchUserDetails = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("tokenKey");
      const response = await axios.get(
        `${API_HOST}/employee/findById/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUserRole(response.data.role);
      setUserBranch(response.data.branch);
      setUserDepartment(response.data.department);

      if (response.data.role === 'BRANCH ADMIN' && response.data.branch) {
        setSearchCriteria(prev => ({
          ...prev,
          branch: response.data.branch.id
        }));
        fetchDepartments(response.data.branch.id);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/CategoryMaster/findAll`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCategoryOptions(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchYears = async () => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(`${YEAR_API}/findAll`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setYearOptions(response.data); // Set fetched years
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/branchmaster/findAll`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setBranchOptions(response.data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchDepartments = async (branchId) => {
    try {
      const token = localStorage.getItem('tokenKey');
      const response = await axios.get(
        `${API_HOST}/DepartmentMaster/findByBranch/${branchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDepartmentOptions(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      const token = localStorage.getItem("tokenKey");
      if (!token) {
        throw new Error("No authentication token found.");
      }

      if (!doc || !doc.id) {
        console.error("Invalid document object");
        return;
      }

      console.log(`Attempting to fetch paths for document ID: ${doc.id}`);
      const response = await axios.get(
        `${DOCUMENTHEADER_API}/byDocumentHeader/${doc.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: response.data || [],
      }));
    } catch (error) {
      console.error("Error fetching documents:", error);
      showPopup(`Failed to fetch document paths: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchCriteria(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'branch' && { department: '' }),
    }));

    setCurrentPage(1);
  };

  const handleSearch = async () => {
    try {
      const token = localStorage.getItem('tokenKey');

      // Validate that at least one search criterion is provided
      const isCriteriaEmpty = !searchCriteria.fileNo &&
        !searchCriteria.title &&
        !searchCriteria.subject &&
        !searchCriteria.version &&
        !searchCriteria.category &&
        !searchCriteria.branch &&
        !searchCriteria.department &&
        !searchCriteria.year;

      if (isCriteriaEmpty) {
        showPopup('Please provide at least one search criterion.');
        return; // Exit the function without making the API call
      }

      const searchPayload = {
        fileNo: searchCriteria.fileNo || null,
        title: searchCriteria.title || null,
        subject: searchCriteria.subject || null,
        version: searchCriteria.version || null,
        categoryId: searchCriteria.category ? parseInt(searchCriteria.category) : null,
        branchId: searchCriteria.branch ? parseInt(searchCriteria.branch) :
          (userBranch?.id ? parseInt(userBranch.id) : null),
        departmentId: searchCriteria.department ? parseInt(searchCriteria.department) :
          (userDepartment?.id ? parseInt(userDepartment.id) : null),
        yearId: searchCriteria.year || null,
        page: currentPage - 1, // Backend uses 0-indexed pages
        size: itemsPerPage,
      };

      const response = await axios.post(
        `${API_HOST}/api/documents/search`,
        searchPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSearchResults(response.data);
      setNoResultsFound(response.data.length === 0);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching documents:', error);
      showPopup('Failed to search documents. Please try again.');
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

  const openModal = (doc) => {
    setSelectedDoc(doc);
    fetchPaths(doc);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedDoc({ paths: [] });
  };

  const printPage = () => {
    window.print();
  };

  const openFile = async (file) => {
    const token = localStorage.getItem("tokenKey");
    const createdOnDate = new Date(file.createdOn);
    const year = createdOnDate.getFullYear();
    const month = String(createdOnDate.getMonth() + 1).padStart(2, "0");
    const category = file.documentHeader.categoryMaster.name;
    const fileName = file.docName;

    const fileUrl = `${API_HOST}/api/documents/${year}/${month}/${category}/${fileName}`;

    try {
      const response = await axios.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const contentType = response.headers["content-type"];
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (error) {
      console.error("Error fetching file:", error);
      showPopup("There was an error opening the file. Please try again.");
    }
  };

  const showPopup = (message, type = 'info') => {
    setPopupMessage({ message, type });
  };


  // Add a computed property to get paginated results
  const getPaginatedResults = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchResults.slice(startIndex, endIndex);
  };

  // Calculate total pages based on all search results
  const calculateTotalPages = () => {
    return Math.ceil(searchResults.length / itemsPerPage);
  };

  userRole = localStorage.getItem('role');
  const renderSearchFields = () => {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4 bg-slate-100 p-4 rounded-lg">
        {userRole === 'ADMIN' ? (
          <>
            {/* Branch Select */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={searchCriteria.branch}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Department Select */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={searchCriteria.department}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!searchCriteria.branch}
              >
                <option value="">Select Department</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : userRole === 'BRANCH ADMIN' ? (
          <>
            {/* Branch Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={searchCriteria.branch}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                disabled={true}
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </label>

            {/* Department Select */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={searchCriteria.department}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departmentOptions.length > 0 ? (
                  departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))
                ) : (
                  <option value="">No Departments Available</option>
                )}
              </select>
            </label>
          </>
        ) : (
          <>
            {/* Branch Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Branch
              <select
                name="branch"
                value={userBranch?.id || ''}
                disabled
                className="mt-1 block w-full p-3 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value={userBranch?.id}>{userBranch?.name}</option>
              </select>
            </label>

            {/* Department Input (Fixed) */}
            <label className="block text-md font-medium text-gray-700">
              Department
              <select
                name="department"
                value={userDepartment?.id || ''}
                disabled
                className="mt-1 block w-full p-3 border rounded-md outline-none bg-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value={userDepartment?.id}>{userDepartment?.name}</option>
              </select>
            </label>
          </>
        )}

        {/* Category Select */}
        <label className="block text-md font-medium text-gray-700">
          Category
          <select
            name="category"
            value={searchCriteria.category}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Category</option>
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
            value={searchCriteria.year}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Year</option>
            {yearOptions.map((yearID) => (
              <option key={yearID.id} value={yearID.id}>
                {yearID.name}
              </option>
            ))}
          </select>
        </label>

        {/* File No. Input */}
        <label className="block text-md font-medium text-gray-700">
          File No.
          <input
            type="text"
            name="fileNo"
            placeholder="File No."
            value={searchCriteria.fileNo}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Title Input */}
        <label className="block text-md font-medium text-gray-700">
          Title
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={searchCriteria.title}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Subject Input */}
        <label className="block text-md font-medium text-gray-700">
          Subject
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={searchCriteria.subject}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* Version Input */}
        <label className="block text-md font-medium text-gray-700">
          Version
          <input
            type="text"
            name="version"
            placeholder="Version"
            value={searchCriteria.version}
            onChange={handleInputChange}
            className="mt-1 block w-full p-3 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {/* <select
        name="category"
        value={searchCriteria.category}
        onChange={handleInputChange}
        className="p-2 border rounded-md outline-none"
      >
        <option value="">Select Category</option>
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select> */}
        {/* {userRole === 'ADMIN' ? (
        <>
          <select
            name="branch"
            value={searchCriteria.branch}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
          >
            <option value="">Select Branch</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            name="department"
            value={searchCriteria.department}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
            disabled={!searchCriteria.branch}
          >
            <option value="">Select Department</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </>
      ) : userRole === 'BRANCH ADMIN' ? (
        <>
          <select
            name="branch"
            value={searchCriteria.branch}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
            disabled={true}  // Branch is fixed, so no need to change
          >
            <option value={userBranch?.id}>{userBranch?.name}</option>
          </select>

        
          <select
            name="department"
            value={searchCriteria.department}
            onChange={handleInputChange}
            className="p-2 border rounded-md outline-none"
          >
            <option value="">Select Department</option>
            {departmentOptions.length > 0 ? (
              departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))
            ) : (
              <option value="">No Departments Available</option>
            )}
          </select>
        </>
      ) : (
        <>
          <select
            name="branch"
            value={userBranch?.id || ''}
            disabled
            className="p-2 border rounded-md outline-none bg-gray-100"
          >
            <option value={userBranch?.id}>{userBranch?.name}</option>
          </select>
          <select
            name="department"
            value={userDepartment?.id || ''}
            disabled
            className="p-2 border rounded-md outline-none bg-gray-100"
          >
            <option value={userDepartment?.id}>{userDepartment?.name}</option>
          </select>
        </>
      )} */}
      </div>
    );
  };

  return (
    <div className="p-1">
      <h1 className="text-xl mb-4 font-semibold">Search Documents</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={() => setPopupMessage(null)}
          />
        )}

        {renderSearchFields()}
        <button
          onClick={handleSearch}
          className="bg-blue-900 text-white rounded-md py-2 px-4 hover:bg-blue-800 transition duration-300"
        >
          Search
        </button>

        {/* Search Results Table */}
        {noResultsFound ? (
          <div className="mt-4 text-red-600">
            <h3>No results found for your search.</h3>
          </div>
        ) : (
          searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-3">Search Results</h3>
              <table className="min-w-full table-auto bg-white shadow-md rounded-lg">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-2 text-left">File No</th>
                    <th className="border p-2 text-left">Title</th>
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2 text-left">Version</th>
                    <th className="border p-2 text-left">Category</th>
                    <th className="border p-2 text-left">Year</th>
                    <th className="border p-2 text-left">Branch</th>
                    <th className="border p-2 text-left">Department</th>
                    <th className="border p-2 text-left">Approval Status</th>
                    <th className="border p-2 text-left">Uploaded Date</th>
                    <th className="border p-2 text-left">View</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedResults().map((document) => (
                    <tr key={document.id}>
                      <td className="border p-2">{document.fileNo}</td>
                      <td className="border p-2">{document.title}</td>
                      <td className="border p-2">{document.subject}</td>
                      <td className="border p-2">{document.version}</td>
                      <td className="border p-2">
                        {document.categoryMaster?.name || "No Category"}
                      </td>
                      <td className="border p-2">
                        {document.Year?.name || document.yearMaster?.name || "No Year"}
                      </td>
                      <td className="border p-2">
                        {document.employee && document.employee.branch
                          ? document.employee.branch.name
                          : "No Branch"}
                      </td>
                      <td className="border p-2">
                        {document.employee &&
                          document.employee.department
                          ? document.employee.department.name
                          : "No Department"}
                      </td>
                      <td className="border p-2">{document.approvalStatus}</td>
                      <td className="border p-2">{formatDate(document.createdOn)}</td>
                      <td className="border p-2">
                        <button onClick={() => openModal(document)}>
                          <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{calculateTotalPages()}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-blue-900 text-white rounded-md py-2 px-4 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, calculateTotalPages()))}
              disabled={currentPage === calculateTotalPages()}
              className="bg-blue-900 text-white rounded-md py-2 px-4 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document View Modal */}
        {isOpen && selectedDoc && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
            <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
              <button
                className="absolute top-2 right-10 text-gray-500 hover:text-gray-700 no-print"
                onClick={printPage}
              >
                <PrinterIcon className="h-6 w-6" />
              </button>

              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 no-print"
                onClick={closeModal}
              >
                <XMarkIcon className="h-6 w-6 text-black hover:text-white hover:bg-red-800" />
              </button>

              <div className="h-1/2 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4 mt-4">
                  <div className="flex items-start space-x-1">
                    <p className="text-sm text-black font-bold border-b-4 border-black">D</p>
                    <p className="text-sm text-black font-bold border-t-4 border-black">MS</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      <strong>Uploaded Date:</strong>{" "}
                      {formatDate(selectedDoc?.createdOn)}
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <p className="text-sm text-gray-600">
                    <strong>File No.:</strong> {selectedDoc?.fileNo || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Title:</strong> {selectedDoc?.title || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Subject:</strong> {selectedDoc?.subject || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Version:</strong> {selectedDoc?.version || "N/A"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Category:</strong> {selectedDoc?.categoryMaster?.name || "No Category"}
                  </p>
                </div>
              </div>

              <div className="h-1/2 flex flex-col items-center justify-center mt-4">
                <h1 className="text-sm text-center font-bold mb-2">Attached Files</h1>

                {Array.isArray(selectedDoc.paths) && selectedDoc.paths.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {selectedDoc.paths.map((file, index) => (
                      <li key={index} className="mb-2">
                        <span className="mr-4">{file.docName}</span>
                        <button
                          onClick={() => openFile(file)}
                          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          Open
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No attached files available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;