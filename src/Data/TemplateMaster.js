import { useState, useEffect, useRef, useCallback } from "react";
import Popup from "../Components/Popup"
import { MAS_TEMPLATE } from "../API/apiConfig";
import LoadingComponent from '../Components/LoadingComponent';
import { postRequest, putRequest, getRequest } from "../API/apiHelper";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
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
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const Templatemaster = () => {
  // Get language context
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  // State for tracking data loading only
  const [isLoading, setIsLoading] = useState(true);

  // State for translated placeholders
  const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
    search: 'Search...',
    show: 'Show:',
    enterTemplateCode: 'Enter template code',
    enterTemplateName: 'Enter template name',
  });

  const [templateData, setTemplateData] = useState([]);
  const [formData, setFormData] = useState({ templateCode: "", templateName: "" });
  const [searchQuery, setSearchQuery] = useState("");
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

  // Debug log
  useEffect(() => {
    console.log('🔍 Templatemaster Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  // Function to translate placeholder text
  const translatePlaceholder = useCallback(async (text) => {
    if (isTranslationNeeded()) {
      try {
        return await translate(text);
      } catch (error) {
        console.error('Error translating placeholder:', error);
        return text;
      }
    }
    return text;
  }, [isTranslationNeeded, translate]);

  // Update placeholders when language changes - optimized
  useEffect(() => {
    const updatePlaceholders = async () => {
      // Don't translate if English
      if (!isTranslationNeeded()) {
        setTranslatedPlaceholders({
          search: 'Search...',
          show: 'Show:',
          enterTemplateCode: 'Enter template code',
          enterTemplateName: 'Enter template name',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterTemplateCodePlaceholder = await translatePlaceholder('Enter template code');
      const enterTemplateNamePlaceholder = await translatePlaceholder('Enter template name');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterTemplateCode: enterTemplateCodePlaceholder,
        enterTemplateName: enterTemplateNamePlaceholder,
      });
    };

    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch templates - runs only once on mount
  const fetchTemplates = async (flag = 0) => {
    setIsLoading(true);
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
      console.log('✅ Templates loaded');
    } catch (err) {
      console.error("Error fetching templates:", err);
      showPopup("Failed to fetch templates. Please try again later.", "error");
    } finally {
      setIsLoading(false);
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
        setIsLoading(true);
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
        setIsLoading(false);
        setModalVisible(false);
        setTemplateToToggle(null);
        setIsConfirmDisabled(false);
      }
    }
  };

  // Pagination calculations
  const sortedTemplates = filteredTemplateData.sort((a, b) =>
    (b.status === "y" ? 1 : 0) - (a.status === "y" ? 1 : 0)
  );

  const totalItems = sortedTemplates.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedTemplates = sortedTemplates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const maxPageNumbers = 5;
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1;
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages);
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  // Show loading only if initial data is loading
  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <div className="px-2-">
      <div className="title">
        <h1><AutoTranslate>Template Master</AutoTranslate></h1>
      </div>

      <div className="card">
        {popupMessage && (
          <Popup
            message={popupMessage.message}
            type={popupMessage.type}
            onClose={popupMessage.onClose}
          />
        )}
        {/* Form Section with ref */}
        <div className='mb-8'>
          <div ref={formSectionRef} className="cardLight">
            <div className="grid grid-col-4 itemEnd">
              <div className="form-group ">
                <label>
                  <AutoTranslate>Template Code</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterTemplateCode}
                  name="templateCode"
                  value={formData.templateCode || ""}
                  onChange={handleInputChange}
                  maxLength={TEMPLATE_CODE_MAX_LENGTH}
                  required
                />
              </div>
              <div className="form-group ">
                <label>
                  <AutoTranslate>Template</AutoTranslate><AutoTranslate> Name</AutoTranslate> <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterTemplateName}
                  name="templateName"
                  value={formData.templateName || ""}
                  onChange={handleInputChange}
                  maxLength={TEMPLATE_NAME_MAX_LENGTH}
                  required
                />
              </div>

              <div className="form-group ">
                {editingTemplate === null ? (
                  <button
                    onClick={handleTemplateSave}
                    disabled={!isFormValid || isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${!isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Adding...</AutoTranslate>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Add Template</AutoTranslate>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleTemplateSave}
                    disabled={!isFormValid || isSubmitting}
                    className={`btn-primary flex items-center justify-center w-full ${!isFormValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <AutoTranslate>Updating...</AutoTranslate>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-1" /> <AutoTranslate>Update</AutoTranslate>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>


        <div className="data-search-wrapper">
          <div className="form-group flex items-center gap-4">
            <label htmlFor="itemsPerPage">
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
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

          <div className="form-group">
            <input
              type="text"
              placeholder={translatedPlaceholders.search}
              className="searchIcon"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="">
            <thead>
              <tr>
                <th className="text-center"><AutoTranslate>SN</AutoTranslate></th>
                <th><AutoTranslate>Template Code</AutoTranslate></th>
                <th><AutoTranslate>Template</AutoTranslate><AutoTranslate> Name</AutoTranslate></th>
                <th><AutoTranslate>Status</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Edit</AutoTranslate></th>
                <th className="text-center"><AutoTranslate>Action</AutoTranslate></th>
              </tr>
            </thead>
            <tbody>
              {paginatedTemplates.map((template, index) => (
                <tr key={template.id}>
                  <td className="text-center">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                  <td>{template.templateCode || <AutoTranslate>No Code</AutoTranslate>}</td>
                  <td>{template.templateName || <AutoTranslate>No Name</AutoTranslate>}</td>
                  <td>
                    <AutoTranslate>{template.status === "y" ? 'Active' : 'Inactive'}</AutoTranslate>
                  </td>
                  <td className="text-center">
                    <div className="btn-center">
                      <button
                        onClick={() => handleTemplateEdit(template)}
                        disabled={template.status !== "y"}
                        className={`viewBtn ${template.status !== "y" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  </td>
                  <td className="text-center">
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

        {templateData.length === 0 && (
          <div className="text-center p-4 bg-slate-100 rounded-lg mt-4">
            <AutoTranslate>No templates found.</AutoTranslate>
          </div>
        )}

          {/* Pagination Controls */}
        {templateData.length > 0 && (
        <div className="paginationWp">
          <div className="items">
            <div className="paginationText">
              <span className="text-sm text-gray-700">
                <AutoTranslate>
                  {`Showing ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                    } to ${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} entries.`}
                </AutoTranslate>
              </span>
              {/* Page Count Info */}
              <span className="text-sm text-gray-700 mx-2">
                (<AutoTranslate>Pages</AutoTranslate> {totalPages})
              </span>
            </div>
          </div>
          <div className="items">
            <div className="paginationBtn">
              {/* Previous Button */}
              <button title={`${currentPage === 1 || totalPages === 0 ? "End" : "Previous"}`}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`${currentPage === 1 || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" /> */}
                {/* <AutoTranslate>Previous</AutoTranslate> */}
                <IoIosArrowBack />
              </button>

              {/* Page Number Buttons */}
              {totalPages > 0 && getPageNumbers().map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`${currentPage === page ? "active" : ""}`}>
                  {page}
                </button>
              ))}

              {/* Next Button */}
              <button title={`${currentPage === totalPages || totalPages === 0 ? "End" : "Next"}`}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`${currentPage === totalPages || totalPages === 0 ? "cursor-not-allowed" : ""}`}
              >
                {/* <AutoTranslate>Next</AutoTranslate> */}
                {/* <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" /> */}
                <IoIosArrowForward />
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {modalVisible && (
        <div className="overlayModal">
          <div className="document-modal modal-sm">
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <h2><AutoTranslate>Confirm Status Change</AutoTranslate></h2>
              </div>
            </div>

            {/* Modal body Content */}
            <div className="modal-body">
              <div className="bodyScroller print:overflow-visible print:max-h-none">
                <p className="mb-4">
                  <AutoTranslate>Are you sure you want to</AutoTranslate> {templateToToggle?.status === 'y' ?
                    <AutoTranslate>deactivate</AutoTranslate> :
                    <AutoTranslate>activate</AutoTranslate>} <AutoTranslate>this template</AutoTranslate> <strong>{templateToToggle?.templateName}</strong>?
                </p>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setModalVisible(false)} className="btn-cancel">
                    <AutoTranslate>Cancel</AutoTranslate>
                  </button>
                  <button
                    onClick={confirmToggleStatus}
                    disabled={isConfirmDisabled}
                    className={`btn-primary ${isConfirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {isConfirmDisabled ? <AutoTranslate>Processing...</AutoTranslate> : <AutoTranslate>Confirm</AutoTranslate>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templatemaster;



