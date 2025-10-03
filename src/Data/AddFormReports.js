import { useState, useEffect } from "react"
import Popup from "../Components/Popup"

import { API_HOST, MAS_TEMPLATE, ASSIGN_TEMPLATES, MAS_APPLICATION, ALL_USER_APPLICATION } from "../API/apiConfig";

import LoadingComponent from '../Components/LoadingComponent';

import { postRequest, putRequest, getRequest } from "../API/apiService";



const Addformreports = () => {
    const [loading, setLoading] = useState(false)
    const [popupMessage, setPopupMessage] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)

    // Options for dropdowns
    const [menuNameOptions, setMenuNameOptions] = useState([])
    const [parentIdOptions, setParentIdOptions] = useState([])
    const [appNameOptions, setAppNameOptions] = useState([])

    // Dropdown visibility states
    const [isMenuNameDropdownVisible, setIsMenuNameDropdownVisible] = useState(false)
    const [isParentIdDropdownVisible, setIsParentIdDropdownVisible] = useState(false)
    const [isAppNameDropdownVisible, setIsAppNameDropdownVisible] = useState(false)

    // Form data state - removed status from the UI but keeping it in state with default value 'active'
    const [formData, setFormData] = useState({
        menuId: "",
        menuName: "",
        parentId: "",
        parentName: "",
        url: "",
        sn: "",
        status: "active", // Default status set to active (will be sent as 'y')
    })

    // Edit mode specific states
    const [selectedAppName, setSelectedAppName] = useState("")
    const [isEditDataLoaded, setIsEditDataLoaded] = useState(false)
    const [originalParentId, setOriginalParentId] = useState("")

    // Fetch menu name options
    useEffect(() => {
        const fetchMenuNameOptions = async () => {
            try {
                setLoading(true)
                const response = await getRequest(`${ALL_USER_APPLICATION}/1`)

                if (response && response.response) {
                    const menuOptions = response.response.map((item) => ({
                        id: item.id.toString(),
                        name: item.userAppName,
                        url: item.url,
                    }))
                    setMenuNameOptions(menuOptions)
                } else {
                    console.log("Unexpected response structure:", response)
                    setMenuNameOptions([])
                }
            } catch (err) {
                console.error("Error fetching menu names:", err)
                showPopup("Error fetching menu names. Please try again later.", "error")
            } finally {
                setLoading(false)
            }
        }

        fetchMenuNameOptions()
    }, [])


    // Fetch parent ID options
    useEffect(() => {
        const fetchParentIdOptions = async () => {
            try {
                setLoading(true)
                const response = await getRequest(`${MAS_APPLICATION}/getAllParents/1`)

                if (response && response.response) {
                    const parentOptions = response.response.map((item) => ({
                        id: item.appId ? item.appId.toString() : "",
                        name: item.name || "",
                        url: item.url || "",
                    }))
                    setParentIdOptions(parentOptions)
                } else {
                    console.log("Unexpected response structure:", response)
                    setParentIdOptions([])
                }
            } catch (err) {
                console.error("Error fetching parent IDs:", err)
                showPopup("Error fetching parent IDs. Please try again later.", "error")
            } finally {
                setLoading(false)
            }
        }

        fetchParentIdOptions()
    }, [])

    // Fetch application names for edit mode dropdown
    useEffect(() => {
        const fetchAppNames = async () => {
            if (isEditMode) {
                try {
                    setLoading(true)
                    const response = await getRequest(`${MAS_APPLICATION}/getAll/1`)

                    if (response && response.response) {
                        const appOptions = response.response.map((item) => {
                            // Add null checks for all properties
                            return {
                                id: item.appId ? item.appId.toString() : "",
                                name: item.name || "",
                                parentId: item.parentId || "",
                                url: item.url || "",
                                sn: item.serialNo || "",
                                status: "active", // Always set to active since we're removing the field
                            }
                        })
                        setAppNameOptions(appOptions)
                    } else {
                        console.log("Unexpected response structure:", response)
                        setAppNameOptions([])
                        showPopup("Unexpected response format from server", "error")
                    }
                } catch (err) {
                    console.error("Error fetching application names:", err)
                    showPopup("Error fetching application names. Please try again later.", "error")
                } finally {
                    setLoading(false)
                }
            }
        }

        fetchAppNames()
    }, [isEditMode])

    const showPopup = (message, type = "info") => {
        setPopupMessage({
            message,
            type,
            onClose: () => {
                setPopupMessage(null)
                setShowModal(false)
            },
        })
        setShowModal(true)
    }
    const handleMenuNameChange = (e) => {
        const inputValue = e.target.value
        setFormData((prev) => ({
            ...prev,
            // Only update menuId if not in edit mode
            ...(!isEditMode && { menuId: "" }),
            menuName: inputValue,
            // Only update url if not in edit mode
            ...(!isEditMode && { url: "" }),
        }))
        setIsMenuNameDropdownVisible(true)
    }



    const handleInputChange = (e) => {
        const { id, value } = e.target

        // Prevent changing parent ID in edit mode
        if (isEditMode && id === "parentName") {
            return
        }

        setFormData((prev) => ({
            ...prev,
            [id]: value,
        }))
    }
    const handleMenuNameSelect = (selectedMenu) => {
        setFormData((prev) => ({
            ...prev,

            ...(!isEditMode && { menuId: selectedMenu.id }),
            menuName: selectedMenu.name,

            ...(isEditMode && { url: selectedMenu.url }),

            ...(!isEditMode && { url: selectedMenu.url }),
        }))
        setIsMenuNameDropdownVisible(false)
    }



    const handleParentIdChange = (e) => {
        const inputValue = e.target.value

        // If user explicitly types "0", set parentId to "0"
        if (inputValue === "0") {
            setFormData((prev) => ({
                ...prev,
                parentId: "0",
                parentName: "0",
            }))
            setIsParentIdDropdownVisible(false)
        } else {
            setFormData((prev) => ({
                ...prev,
                parentId: "",
                parentName: inputValue,
            }))
            setIsParentIdDropdownVisible(true)
        }
    }



    const handleParentIdSelect = (selectedParent) => {
        setFormData((prev) => ({
            ...prev,
            parentId: selectedParent.id,
            parentName: selectedParent.name,
        }))
        setIsParentIdDropdownVisible(false)
    }

    const handleAppNameChange = (e) => {
        const inputValue = e.target.value
        setSelectedAppName(inputValue)
        setIsAppNameDropdownVisible(true)
    }

    const handleAppNameSelect = (selectedApp) => {

        console.log("Selected App:", selectedApp)
        // Find the parent name corresponding to the parent ID
        const parentName = parentIdOptions.find(parent => parent.id === selectedApp.parentId)?.name || '';

        setSelectedAppName(selectedApp.name)
        setFormData({
            menuId: selectedApp.id,
            menuName: selectedApp.name,
            parentId: selectedApp.parentId,
            parentName: parentName,
            url: selectedApp.url,
            sn: selectedApp.sn,
            status: "active", // Always set to active
        })
        setOriginalParentId(selectedApp.parentId)
        setIsEditDataLoaded(true)
        setIsAppNameDropdownVisible(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // More Robust Validation
        if (!formData.menuName.trim()) {
            showPopup("Menu Name is required", "warning")
            return
        }
        if (!formData.menuId.trim()) {
            showPopup("Menu ID is required", "warning")
            return
        }
        if (!formData.url.trim()) {
            showPopup("URL is required", "warning")
            return
        }
        // Removed status validation since it will always be 'active'

        try {
            setLoading(true)


            const allApplicationsResponse = await getRequest(`${MAS_APPLICATION}/getAll/0`)

            if (allApplicationsResponse && allApplicationsResponse.response) {

                const isDuplicate = allApplicationsResponse.response.some(app =>
                    app.name.toLowerCase() === formData.menuName.toLowerCase() &&

                    (app.parentId || '') === (isEditMode ? originalParentId : (formData.parentId || '')) &&

                    (!isEditMode || app.appId.toString() !== formData.menuId)
                )

                if (isDuplicate) {
                    showPopup("An application with the same name and parent already exists!", "error")
                    setLoading(false)
                    return
                }
            }

            // Prepare submit data - always send status as "y"
            const submitData = isEditMode
                ? {
                    appId: formData.menuId,
                    name: formData.menuName,
                    parentId: originalParentId,
                    url: formData.url,
                    serialNo: formData.sn,
                    status: "y", // Always set to "y"
                }
                : {
                    menuId: formData.menuId,
                    name: formData.menuName,
                    parentId: formData.parentId || null,
                    url: formData.url,
                    serialNo: formData.sn,
                    status: "y", // Always set to "y"
                }

            const apiCall = isEditMode ? putRequest : postRequest
            const endpoint = isEditMode ? `${MAS_APPLICATION}/UpdateById/${formData.menuId}` : `${MAS_APPLICATION}/create`

            const response = await apiCall(endpoint, submitData)

            // Rest of the existing submit logic remains the same...
            if (response) {
                if (response.response) {
                    showPopup(
                        isEditMode
                            ? "Application updated successfully"
                            : "Application created successfully",
                        "success"
                    )

                    // Reset form and states
                    resetForm()
                } else {

                    console.error('Unexpected response structure:', response)
                    showPopup(
                        isEditMode
                            ? "Failed to update application"
                            : "Failed to create application",
                        "error"
                    )
                }
            } else {
                showPopup("No response received from server", "error")
            }
        } catch (err) {

            console.error("Full error details:", {
                message: err.message,
                response: err.response,
                stack: err.stack
            })


            const errorMessage =
                err.response?.data?.message ||
                err.message ||
                "Unexpected error occurred. Please try again later."

            showPopup(errorMessage, "error")
        } finally {
            setLoading(false)
        }
    }


    const resetForm = () => {
        setFormData({
            menuId: "",
            menuName: "",
            parentId: "",
            parentName: "",
            url: "",
            status: "active", // Reset with default active
        })


        setIsEditDataLoaded(false)
        setSelectedAppName("")
        setOriginalParentId("")
    }

    return (
        <div className="px-2">
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">{isEditMode ? "Edit" : "Add"} Forms/Reports</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm">



                <div className="mb-4 bg-slate-100 p-4 rounded-lg">
                    {/* <div className="bg-white shadow-md rounded-lg overflow-hidden"> */}
                    <div className="p-6">
                        {loading ? (
                            <LoadingComponent />
                        ) : (
                            <form className="space-y-6" onSubmit={handleSubmit}>

                                {isEditMode && (
                                    <div className="grid grid-cols-1 gap-4 mb-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                APP Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                id="appName"
                                                placeholder="Search Application Name"
                                                value={selectedAppName}
                                                onChange={handleAppNameChange}
                                                autoComplete="off"
                                                required
                                                disabled={isEditDataLoaded}
                                            />
                                            {isAppNameDropdownVisible && selectedAppName && (
                                                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                                    {appNameOptions
                                                        .filter((app) =>
                                                            app.name.toLowerCase().includes(selectedAppName.toLowerCase()) ||
                                                            String(app.parentId).toLowerCase().includes(selectedAppName.toLowerCase())
                                                        )
                                                        .map((app) => (
                                                            <li
                                                                key={app.id}
                                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                                                onClick={() => handleAppNameSelect(app)}
                                                            >
                                                                {app.name} (Parent: {app.parentId})
                                                            </li>
                                                        ))}

                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Menu Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            id="menuName"
                                            placeholder="Search Menu Name"
                                            value={formData.menuName}
                                            onChange={handleMenuNameChange}
                                            autoComplete="off"
                                            required
                                            disabled={isEditMode && !isEditDataLoaded}
                                        />
                                        {isMenuNameDropdownVisible && formData.menuName && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                                {menuNameOptions
                                                    .filter((menu) => menu.name.toLowerCase().includes(formData.menuName.toLowerCase()))
                                                    .map((menu) => (
                                                        <li
                                                            key={menu.id}
                                                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                                            onClick={() => handleMenuNameSelect(menu)}
                                                        >
                                                            {menu.name}
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Menu ID <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                                            id="menuId"
                                            placeholder="Menu ID"
                                            value={formData.menuId}
                                            onChange={handleInputChange}
                                            required
                                            readOnly
                                            disabled={isEditMode}
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent ID</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            id="parentName"
                                            placeholder="Search Parent ID"
                                            value={
                                                isEditMode
                                                    ? (formData.parentId ? `${formData.parentId} - ${formData.parentName}` : formData.parentName)
                                                    : formData.parentName
                                            }
                                            onChange={handleParentIdChange}
                                            autoComplete="off"
                                            disabled={isEditMode}
                                        />
                                        {isParentIdDropdownVisible && formData.parentName && !isEditMode && (
                                            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                                {parentIdOptions
                                                    .filter((parent) => parent.name.toLowerCase().includes(formData.parentName.toLowerCase()))
                                                    .map((parent) => (
                                                        <li
                                                            key={parent.id}
                                                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                                            onClick={() => handleParentIdSelect(parent)}
                                                        >
                                                            {parent.name} (ID: {parent.id})
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                        <input type="hidden" id="parentId" value={formData.parentId} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            URL <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                                            id="url"
                                            placeholder="URL"
                                            value={formData.url}
                                            onChange={handleInputChange}
                                            required
                                            readOnly
                                            disabled={isEditMode}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Serial No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                            id="sn"
                                            placeholder="Serial No."
                                            value={formData.sn}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Status field has been removed */}

                                <div className="flex justify-end space-x-2 mt-6">
                                    {isEditMode ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditMode(false)
                                                    setIsEditDataLoaded(false)
                                                    setSelectedAppName("")
                                                    setOriginalParentId("")
                                                    setFormData({
                                                        menuId: "",
                                                        menuName: "",
                                                        parentId: "",
                                                        parentName: "",
                                                        url: "",
                                                        status: "active", // Reset with default active
                                                    })
                                                }}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-700"
                                                disabled={!isEditDataLoaded}
                                            >
                                                Update
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="submit"
                                                className="px-4 py-2  bg-blue-900 text-white rounded-md hover:bg-blue-700"
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsEditMode(true)}
                                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                            >
                                                Edit
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* Popup Component */}
                        {showModal && popupMessage && (
                            <Popup message={popupMessage.message} type={popupMessage.type} onClose={popupMessage.onClose} />
                        )}
                    </div>
                    {/* </div> */}
                </div>

            </div>
        </div>
    )
}

export default Addformreports