"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
} from "@heroicons/react/24/solid"
import { ALL_USER_APPLICATION, USER_APPLICATION } from "../API/apiConfig"
import LoadingComponent from "../Components/LoadingComponent"
import { postRequest, putRequest, getRequest } from "../API/apiService"
import Popup from "../Components/Popup"
import AutoTranslate from "../i18n/AutoTranslate"
import { useLanguage } from "../i18n/LanguageContext"

const ManageUserApplication = () => {
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
    enterMenuName: 'Enter menu name',
    enterUrl: 'Enter URL',
  });

  const [userApplicationData, setUserApplicationData] = useState([])
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    applicationId: null,
    newStatus: false,
  })
  const [formData, setFormData] = useState({
    menuName: "",
    url: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState(null)
  const [isFormValid, setIsFormValid] = useState(false)
  const [editingApplication, setEditingApplication] = useState(null)
  const [popupMessage, setPopupMessage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formSectionRef = useRef(null)

  const MENU_NAME_MAX_LENGTH = 250
  const URL_MAX_LENGTH = 250

  // Debug log
  useEffect(() => {
    console.log('🔍 ManageUserApplication Component - Language Status:', {
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
          enterMenuName: 'Enter menu name',
          enterUrl: 'Enter URL',
        });
        return;
      }

      // Only update if language changed
      const searchPlaceholder = await translatePlaceholder('Search...');
      const showPlaceholder = await translatePlaceholder('Show:');
      const enterMenuNamePlaceholder = await translatePlaceholder('Enter menu name');
      const enterUrlPlaceholder = await translatePlaceholder('Enter URL');

      setTranslatedPlaceholders({
        search: searchPlaceholder,
        show: showPlaceholder,
        enterMenuName: enterMenuNamePlaceholder,
        enterUrl: enterUrlPlaceholder,
      });
    };
    
    updatePlaceholders();
  }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

  // Fetch applications - runs only once on mount
  useEffect(() => {
    fetchApplications(0)
  }, [])

  const fetchApplications = async (flag = 0) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await getRequest(`${ALL_USER_APPLICATION}/${flag}`)
      console.log("API Response:", response)

      if (response && response.response) {
        const mappedApplications = response.response.map((app) => ({
          id: app.id,
          menuName: app.userAppName || "No Name",
          url: app.url || "No URL",
          status: app.status || "n",
        }))
        setUserApplicationData(mappedApplications)
        console.log('✅ User applications loaded');
      } else {
        throw new Error("Invalid response structure")
      }
    } catch (err) {
      console.error("Error fetching applications:", err)
      setError("Failed to fetch applications. Please try again later.")
      showPopup('Failed to load user applications', 'error');
    } finally {
      setIsLoading(false)
    }
  }

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null)
      },
    })
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const filteredUserApplicationData = userApplicationData.filter(
    (application) =>
      application.menuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      application.url.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({ ...prevData, [name]: value }))

    // Form validation after state update
    const updatedFormData = { ...formData, [name]: value }
    setIsFormValid(updatedFormData.menuName.trim() !== "" && updatedFormData.url.trim() !== "")
  }

  const handleEdit = (application) => {
    setEditingApplication(application)
    setFormData({
      menuName: application.menuName,
      url: application.url,
    })
    setIsFormValid(true)

    // Scroll to form section
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isFormValid) return

    try {
      setIsSubmitting(true)

      // Check for duplicates excluding the current editing application
      const isDuplicate = userApplicationData.some(
        (app) => (editingApplication ? app.id !== editingApplication.id : true) && app.menuName === formData.menuName,
      )

      if (isDuplicate) {
        showPopup("Application with the same name already exists!", "error")
        setIsSubmitting(false)
        return
      }

      if (editingApplication) {
        // Update existing application
        const response = await putRequest(`${USER_APPLICATION}/edit/${editingApplication.id}`, {
          userAppName: formData.menuName,
          url: formData.url,
        })

        console.log("Update Response:", response)

        if (response && response.response) {
          const updatedApplication = response.response

          setUserApplicationData((prevData) =>
            prevData.map((app) =>
              app.id === editingApplication.id
                ? {
                    ...app,
                    menuName: updatedApplication.userAppName || formData.menuName,
                    url: updatedApplication.url || formData.url,
                    status: updatedApplication.status || app.status,
                  }
                : app,
            ),
          )

          showPopup("Application updated successfully!", "success")
        } else {
          throw new Error("Invalid response from server")
        }
      } else {
        // Create a new application
        const response = await postRequest(`${USER_APPLICATION}/create`, {
          userAppName: formData.menuName,
          url: formData.url,
          // status: "y",
        })

        console.log("Create Response:", response)

        if (response && response.response) {
          const newApplication = response.response

          setUserApplicationData((prevData) => [
            ...prevData,
            {
              id: newApplication.id || Date.now(),
              menuName: newApplication.userAppName || formData.menuName,
              url: newApplication.url || formData.url,
              status: "y",
            },
          ])

          showPopup("Application added successfully!", "success")
        } else {
          throw new Error("Invalid response from server")
        }
      }

      setFormData({ menuName: "", url: "" })
      setEditingApplication(null)
    } catch (error) {
      console.error("Error saving application:", error)
      showPopup("An error occurred while saving the application!", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSwitchChange = (id, currentStatus) => {
    const newStatus = currentStatus?.toLowerCase() === "y" ? "n" : "y"

    setConfirmDialog({
      isOpen: true,
      applicationId: id,
      newStatus: newStatus,
    })
  }

  const handleConfirm = async (confirmed) => {
    if (confirmed && confirmDialog.applicationId !== null) {
      try {
        setIsLoading(true)

        const response = await putRequest(
          `${USER_APPLICATION}/status/${confirmDialog.applicationId}?status=${confirmDialog.newStatus}`,
        )

        if (response && response.status === 200) {
          setUserApplicationData((prevData) =>
            prevData.map((app) =>
              app.id === confirmDialog.applicationId ? { ...app, status: confirmDialog.newStatus } : app,
            ),
          )

          showPopup(
            `Application ${confirmDialog.newStatus === "y" ? "activated" : "deactivated"} successfully!`,
            "success",
          )
        }
      } catch (err) {
        console.error("Error updating application status:", err)
        showPopup(`Failed to update status: ${err.response?.data?.message || err.message}`, "error")
      } finally {
        setIsLoading(false)
      }
    }
    setConfirmDialog({ isOpen: false, applicationId: null, newStatus: null })
  }

  const sortedApplications = filteredUserApplicationData.sort((a, b) => 
    (b.status?.toLowerCase() === "y" ? 1 : 0) - (a.status?.toLowerCase() === "y" ? 1 : 0)
  )
  const totalItems = sortedApplications.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedApplications = sortedApplications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  // Show loading only if initial data is loading
  if (isLoading) {
    return <LoadingComponent />
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">
        <AutoTranslate>Manage Menu</AutoTranslate>
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        {popupMessage && (
          <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
        )}

        <div ref={formSectionRef} className="mb-4 bg-slate-100 p-2 rounded-lg">
          <div className="flex gap-6">
            <div className="w-4/5 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>Menu Name</AutoTranslate> <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterMenuName}
                  name="menuName"
                  value={formData.menuName}
                  onChange={handleInputChange}
                  maxLength={MENU_NAME_MAX_LENGTH}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>

              <label className="block text-md font-medium text-gray-700">
                <AutoTranslate>URL</AutoTranslate> <span className="text-red-500">*</span>
                <input
                  type="text"
                  placeholder={translatedPlaceholders.enterUrl}
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  maxLength={URL_MAX_LENGTH}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>
            </div>

            <div className="w-1/5 flex items-end">
              {editingApplication === null ? (
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${!isFormValid || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Adding...</AutoTranslate>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5 mr-1" />
                      <AutoTranslate>Add Menu</AutoTranslate>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || isSubmitting}
                  className={`bg-blue-900 text-white rounded-2xl p-2 w-full text-sm flex items-center justify-center ${!isFormValid || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <AutoTranslate>Updating...</AutoTranslate>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      <AutoTranslate>Update</AutoTranslate>
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
              <AutoTranslate>Show:</AutoTranslate>
            </label>
            <select
              id="itemsPerPage"
              className="border rounded-r-lg p-1.5 outline-none w-full"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
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
              placeholder={translatedPlaceholders.search}
              className="border rounded-l-md p-1 outline-none w-full"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
          </div>
        </div>

        <>
          {userApplicationData.length === 0 ? (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-center">
              <AutoTranslate>No applications found.</AutoTranslate>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border p-2 text-left"><AutoTranslate>Menu Name</AutoTranslate></th>
                    <th className="border p-2 text-left"><AutoTranslate>URL</AutoTranslate></th>
                    <th className="border p-2 text-left"><AutoTranslate>Status</AutoTranslate></th>
                    <th className="border p-2 text-left"><AutoTranslate>Edit</AutoTranslate></th>
                    <th className="border p-2 text-left"><AutoTranslate>Action</AutoTranslate></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApplications.map((application) => (
                    <tr key={application.id}>
                      <td className="border p-2">{application.menuName || <AutoTranslate>No Name</AutoTranslate>}</td>
                      <td className="border p-2">{application.url || <AutoTranslate>No URL</AutoTranslate>}</td>
                      <td className="border p-2">
                        {application.status === "y" ? "Active" : "Inactive"}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => handleEdit(application)}
                          disabled={application.status?.toLowerCase() !== "y"}
                          className={`${application.status?.toLowerCase() !== "y" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                        </button>
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => handleSwitchChange(application.id, application.status)}
                          className={`p-1 rounded-full ${
                            application.status?.toLowerCase() === "y" ? "bg-green-500" : "bg-red-500"
                          }`}
                        >
                          {application.status?.toLowerCase() === "y" ? (
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
          )}

          {/* Pagination */}
          {filteredUserApplicationData.length > 0 && (
            <div className="flex items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${currentPage === 1 || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                <AutoTranslate>Previous</AutoTranslate>
              </button>

              {totalPages > 0 &&
                getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded mx-1 ${currentPage === page ? "bg-blue-900 text-white" : "bg-slate-200 hover:bg-blue-100"}`}
                  >
                    {page}
                  </button>
                ))}

              <span className="text-sm text-gray-700 mx-2">
                <AutoTranslate>of</AutoTranslate> {totalPages} <AutoTranslate>pages</AutoTranslate>
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded ml-3 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"}`}
              >
                <AutoTranslate>Next</AutoTranslate>
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>
              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  <AutoTranslate>
                    {`Here are items ${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to ${Math.min(currentPage * itemsPerPage, totalItems)} out of ${totalItems}.`}
                  </AutoTranslate>
                </span>
              </div>
            </div>
          )}
        </>

        {/* Confirmation Dialog */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h2 className="text-lg font-semibold mb-4">
                <AutoTranslate>Confirm Status Change</AutoTranslate>
              </h2>
              <p className="mb-4">
                <AutoTranslate>Are you sure you want to</AutoTranslate> {confirmDialog.newStatus === "y" ? 
                  <AutoTranslate>activate</AutoTranslate> : 
                  <AutoTranslate>deactivate</AutoTranslate>}{" "}
                <strong>{userApplicationData.find((app) => app.id === confirmDialog.applicationId)?.menuName}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => handleConfirm(false)}
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  <AutoTranslate>No</AutoTranslate>
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  <AutoTranslate>Yes</AutoTranslate>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageUserApplication