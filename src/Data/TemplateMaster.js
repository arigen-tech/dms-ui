import { useState, useEffect, useRef } from "react";
import Popup from "../Components/Popup"

import { API_HOST, MAS_TEMPLATE } from "../API/apiConfig";
import LoadingComponent from '../Components/LoadingComponent';

import { postRequest, putRequest, getRequest } from "../API/apiService";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

const Templatemaster = () => {
  const [templateData, setTemplateData] = useState([]);
  const [formData, setFormData] = useState({ templateCode: "", templateName: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [modalVisible, setModalVisible] = useState(false);
  const [templateToToggle, setTemplateToToggle] = useState(null);
  const [isConfirmDisabled, setIsConfirmDisabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formSectionRef = useRef(null);

  const TEMPLATE_CODE_MAX_LENGTH = 48;
  const TEMPLATE_NAME_MAX_LENGTH = 120;

  const fetchTemplates = async (flag = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRequest(`${MAS_TEMPLATE}/getAll/${flag}`);
      
      const templateList = response.response || [];
      const mappedTemplates = templateList.map(template => ({
        id: template.id,
        templateCode: template.templateCode || "No Code",
        templateName: template.templateName || "No Name",
        status: template.status || "n"
      }));

      setTemplateData(mappedTemplates);
    } catch (err) {
      console.error("Error fetching templates:", err);
      showPopup("Failed to fetch templates. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(0);
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const filteredTemplateData = templateData.filter(template =>
    template.templateCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.templateName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const isFormValid = formData.templateCode.trim() !== "" && formData.templateName.trim() !== "";

  const handleTemplateEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      templateCode: template.templateCode,
      templateName: template.templateName
    });

    // Scroll to form section
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      
      const isDuplicate = templateData.some(
        (template) =>
          (template.templateCode === formData.templateCode ||
          template.templateName === formData.templateName) &&
          template.id !== editingTemplate?.id
      );

      if (isDuplicate) {
        showPopup("Template with the same code or name already exists!", "error");
        setIsSubmitting(false);
        return;
      }

      if (editingTemplate) {
        // Update existing template
        const response = await putRequest(`${MAS_TEMPLATE}/updateById/${editingTemplate.id}`, {
          templateCode: formData.templateCode,
          templateName: formData.templateName
        });

        console.log("Update Response:", response);

        if (response && response.response) {
          const updatedTemplate = response.response;

          // Update local state using the response from backend
          setTemplateData(prevData =>
            prevData.map(template =>
              template.id === editingTemplate.id
                ? {
                  id: updatedTemplate.id || editingTemplate.id,
                  templateCode: updatedTemplate.templateCode || formData.templateCode,
                  templateName: updatedTemplate.templateName || formData.templateName,
                  status: updatedTemplate.status || editingTemplate.status
                }
                : template
            )
          );

          showPopup("Template updated successfully!", "success");
        } else {
          throw new Error("Invalid response from server");
        }
      } else {
        // Create new template
        const response = await postRequest(`${MAS_TEMPLATE}/create`, {
          templateCode: formData.templateCode,
          templateName: formData.templateName,
          status: "y"
        });

        console.log("Create Response:", response);

        if (response && response.response) {
          const newTemplate = response.response;

          // Add new entry to local state using the response from backend
          setTemplateData(prevData => [
            ...prevData,
            {
              id: newTemplate.id || Date.now(),
              templateCode: newTemplate.templateCode || formData.templateCode,
              templateName: newTemplate.templateName || formData.templateName,
              status: newTemplate.status || "y"
            }
          ]);

          showPopup("New template added successfully!", "success");
        } else {
          throw new Error("Invalid response from server");
        }
      }

      // Reset form
      setFormData({ templateCode: "", templateName: "" });
      setEditingTemplate(null);
    } catch (err) {
      console.error("Error saving template:", err);
      showPopup(`Failed to save: ${err.response?.data?.message || err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (template) => {
    setTemplateToToggle(template);
    setModalVisible(true);
  };

  const confirmToggleStatus = async () => {
    setIsConfirmDisabled(true);

    if (templateToToggle) {
      try {
        setLoading(true);
        const newStatus = templateToToggle.status === "y" ? "n" : "y";
        const response = await putRequest(
          `${MAS_TEMPLATE}/status/${templateToToggle.id}?status=${newStatus}`
        );

        console.log("API Response:", response);

        if (response && response.response) {
          const updatedTemplate = response.response;

          setTemplateData(prevData =>
            prevData.map(template =>
              template.id === templateToToggle.id
                ? {
                  ...template,
                  status: updatedTemplate.status || newStatus
                }
                : template
            )
          );

          showPopup(
            `Template ${newStatus === 'y' ? 'activated' : 'deactivated'} successfully!`,
            "success"
          );
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("Error updating status:", err);
        showPopup("Failed to change status", "error");
      } finally {
        setLoading(false);
        setModalVisible(false);
        setTemplateToToggle(null);
        setIsConfirmDisabled(false);
      }
    }
  };

  // Pagination calculations
  const filteredTotalPages = Math.ceil(filteredTemplateData.length / itemsPerPage);
  const currentItems = filteredTemplateData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, filteredTotalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">Template Master</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">

        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}

        {/* Form Section with ref */}
        <div ref={formSectionRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block text-md font-medium text-gray-700">
                Template Code <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder="Enter template code"
                  name="templateCode"
                  value={formData.templateCode || ""}
                  onChange={handleInputChange}
                  maxLength={TEMPLATE_CODE_MAX_LENGTH}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>

              <label className="block text-md font-medium text-gray-700">
                Template Name <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder="Enter template name"
                  name="templateName"
                  value={formData.templateName || ""}
                  onChange={handleInputChange}
                  maxLength={TEMPLATE_NAME_MAX_LENGTH}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingTemplate === null ? (
                <button
                  onClick={handleTemplateSave}
                  disabled={!isFormValid || isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${!isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    'Adding...'
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" /> Add Template
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleTemplateSave}
                  disabled={!isFormValid || isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${!isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    'Updating...'
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 bg-slate-100 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center bg-blue-500 rounded-lg w-full flex-1 md:w-1/2">
            <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
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
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
          
          <button
            onClick={() => fetchTemplates(0)}
            className="bg-blue-900 text-white rounded-2xl p-2 text-sm flex items-center justify-center"
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">SR.</th>
                <th className="border p-2 text-left">Template Code</th>
                <th className="border p-2 text-left">Template Name</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Edit</th>
                <th className="border p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((template, index) => (
                <tr key={template.id}>
                  <td className="border p-2">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td className="border p-2">{template.templateCode || "No Code"}</td>
                  <td className="border p-2">{template.templateName || "No Name"}</td>
                  <td className="border p-2">{template.status === "y" ? 'Active' : 'Inactive'}</td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleTemplateEdit(template)}
                      disabled={template.status !== "y"}
                      className={`${template.status !== "y" ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                    </button>
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleToggleStatus(template)}
                      className={`p-1 rounded-full ${template.status === 'y' ? 'bg-green-500' : 'bg-red-500'}`}
                    >
                      {template.status === 'y' ? (
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

        {filteredTemplateData.length === 0 && (
          <div className="text-center p-4 bg-slate-100 rounded-lg mt-4">
            No templates found.
          </div>
        )}

        {filteredTemplateData.length > 0 && (
          <div className="flex items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || filteredTotalPages === 0}
              className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || filteredTotalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
              Previous
            </button>

            {filteredTotalPages > 0 && getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                  }`}
              >
                {page}
              </button>
            ))}

            <span className="text-sm text-gray-700 mx-2">of {filteredTotalPages} pages</span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, filteredTotalPages))}
              disabled={currentPage === filteredTotalPages || filteredTotalPages === 0}
              className={`px-3 py-1 rounded ml-3 ${currentPage === filteredTotalPages || filteredTotalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                }`}
            >
              Next
              <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
            </button>
            <div className="ml-4">
              <span className="text-sm text-gray-700">
                Showing {filteredTemplateData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredTemplateData.length)} of{" "}
                {filteredTemplateData.length} entries
              </span>
            </div>
          </div>
        )}
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Status Change</h2>
            <p className="mb-4">Are you sure you want to {templateToToggle?.status === 'y' ? 'deactivate' : 'activate'} this template <strong>{templateToToggle?.templateName}</strong>?</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setModalVisible(false)} className="bg-gray-300 p-2 rounded-lg">Cancel</button>
              <button
                onClick={confirmToggleStatus}
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

export default Templatemaster;