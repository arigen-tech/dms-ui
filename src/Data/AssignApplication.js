import React, { useState, useEffect } from "react";
import { postRequest, putRequest, getRequest } from "../API/apiService";
import { API_HOST, MAS_TEMPLATE, ASSIGN_TEMPLATES, MAS_APPLICATION } from "../API/apiConfig";
import LoadingComponent from '../Components/LoadingComponent';
import {
  PlusCircleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';
import Popup from "../Components/Popup"

const AssignApplication = () => {
    const [showForm, setShowForm] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = 3;
    const totalProducts = 12;
    const [popupMessage, setPopupMessage] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showModuleSection, setShowModuleSection] = useState(false);
    const [selectedParentApp, setSelectedParentApp] = useState('');
    const [showModuleTable, setShowModuleTable] = useState(false);
    const [parentApplications, setParentApplications] = useState([]);
    const [childApplications, setChildApplications] = useState([]);
    const [templateModules, setTemplateModules] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTemplates(1);
        fetchParentApplications();
    }, []);

    const fetchParentApplications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getRequest(`${MAS_APPLICATION}/getAllParents/1`);

            if (response && response.response) {
                const allParentApps = [];

                const findParentApps = (apps) => {
                    apps.forEach(app => {
                        if (app.parentId === "0" || app.url === "#") {
                            allParentApps.push({
                                id: app.appId,
                                applicationCode: app.appId,
                                applicationName: app.name,
                                status: app.status || "n"
                            });
                        }
                        
                        if (app.children) {
                            findParentApps(app.children);
                        }
                    });
                };

                findParentApps(response.response);
                setParentApplications(allParentApps);
            }
        } catch (err) {
            console.error("Error fetching parent applications:", err);
            setError("Failed to fetch parent applications. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async (flag = 1) => {
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

            setTemplates(mappedTemplates);
        } catch (err) {
            console.error("Error fetching templates:", err);
            setError("Failed to fetch templates. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const processChildApplications = (apps, parentPath = "", srNoStart = 1) => {
        setLoading(true);
        let result = [];
        let currentSrNo = srNoStart;

        if (!apps || !Array.isArray(apps)) return result;

        for (const app of apps) {
            const displayPath = parentPath ? `${parentPath}->${app.name}` : app.name;

            const currentApp = {
                srNo: currentSrNo++,
                module: app.name,
                displayName: displayPath, // Fixed: changed from undefined displayName to displayPath
                templateId: app.templateId || null,
                appId: app.appId,
                status: app.status?.toLowerCase() || 'n',
                lastChgDate: app.lastChgDate,
                checked: app.assigned && app.status?.toLowerCase() === 'y',
                parentHierarchy: parentPath,
                nestLevel: parentPath ? parentPath.split("->").length : 0,
                isParent: app.children && app.children.length > 0,
                expanded: true
            };

            result.push(currentApp);

            if (app.children && Array.isArray(app.children) && app.children.length > 0) {
                const childResults = processChildApplications(
                    app.children,
                    displayPath,
                    currentSrNo
                );
                currentSrNo += childResults.length;
                result = [...result, ...childResults];
            }
        }

        return result;
    };

    const handleToggleExpand = (appId) => {
        setChildApplications(prevData => {
            const itemToToggle = prevData.find(item => item.appId === appId);
            if (!itemToToggle || !itemToToggle.isParent) return prevData;

            const updatedData = prevData.map(item =>
                item.appId === appId ? { ...item, expanded: !item.expanded } : item
            );

            return updatedData;
        });
    };

    const handleParentApplicationSelect = async (e) => {
        const selectedParentId = e.target.value;
        setSelectedParentApp(selectedParentId);
        setLoading(true);

        try {
            const childResponse = await getRequest(`${MAS_APPLICATION}/getAllChildrenByParentId/${selectedParentId}?templateId=${selectedTemplate || ''}`);

            if (!childResponse?.response) {
                throw new Error("Failed to fetch child applications");
            }

            const selectedParentApp = parentApplications.find(app => app.id === selectedParentId);
            const parentName = selectedParentApp?.applicationName || "";

            const processedChildren = processChildApplications(childResponse.response, "");

            setChildApplications(processedChildren);
            setShowModuleTable(true);
        } catch (error) {
            console.error("Error fetching child applications:", error);
            setPopupMessage({
                message: "Failed to load child applications",
                type: "error",
                onClose: () => setPopupMessage(null)
            });
        }
        finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = async (e) => {
        const selectedTemplateId = e.target.value;
        setSelectedTemplate(selectedTemplateId);
        setLoading(true);

        try {
            const response = await getRequest(`${ASSIGN_TEMPLATES}/getAllTemplateById/${selectedTemplateId}`);

            if (response && response.response) {
                const formattedData = response.response.map((template, index) => {
                    return {
                        srNo: index + 1,
                        module: template.appName || "Unknown Module",
                        templateId: template.templateId,
                        appId: template.appId,
                        status: template.status,
                        lastChgDate: template.lastChgDate
                    };
                });

                setTemplateModules(formattedData);

                if (selectedParentApp) {
                    handleParentApplicationSelect({ target: { value: selectedParentApp } });
                }
            }
        } catch (error) {
            console.error("Error fetching template details:", error);
            setPopupMessage({
                message: "Failed to load template details",
                type: "error",
                onClose: () => setPopupMessage(null)
            });
        }
        finally {
            setLoading(false);
        }
    };

    const handleEditClick = () => {
        setIsEditMode(!isEditMode);
    };

    const handleAddClick = () => {
        if (!selectedTemplate) {
            setPopupMessage({
                message: "You must select a template first.",
                type: "warning",
                onClose: () => setPopupMessage(null)
            });
            return;
        }

        setShowModuleSection(true);
        setPopupMessage(null);
    };

    const handleFeatureToggle = (appId) => {
        setChildApplications(prevData => {
            const itemIndex = prevData.findIndex(item => item.appId === appId);
            if (itemIndex === -1) return prevData;

            const clickedItem = prevData[itemIndex];
            const newCheckedState = !clickedItem.checked;

            const newData = [...prevData];
            newData[itemIndex] = { ...clickedItem, checked: newCheckedState };

            if (newCheckedState && clickedItem.parentHierarchy) {
                const parentChain = clickedItem.displayName.split("->");
                parentChain.pop();
                let currentPath = "";
                
                for (let i = 0; i < parentChain.length; i++) {
                    if (i === 0) {
                        currentPath = parentChain[i];
                    } else {
                        currentPath = `${currentPath}->${parentChain[i]}`;
                    }
                    
                    const parentIndex = newData.findIndex(item => item.displayName === currentPath);
                    
                    if (parentIndex !== -1) {
                        newData[parentIndex] = { ...newData[parentIndex], checked: true };
                    }
                }
            }
            
            if (!newCheckedState && clickedItem.isParent) {
                const clickedPath = clickedItem.displayName;
                
                for (let i = 0; i < newData.length; i++) {
                    const item = newData[i];
                    if (item.displayName !== clickedPath && 
                        item.displayName.startsWith(clickedPath + "->")) {
                        newData[i] = { ...item, checked: false };
                    }
                }
            }

            return newData;
        });
    };

    const handleSelectAllFeatures = () => {
        const allChecked = childApplications.every(item => item.checked);
        setChildApplications(prevData =>
            prevData.map(mod => ({ ...mod, checked: !allChecked }))
        );
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            
            const selectedChildren = childApplications.filter(item => item.checked);
            const unselectedChildren = childApplications.filter(item => !item.checked);

            if (childApplications.length === 0) {
                setPopupMessage({
                    message: "No child applications available to update.",
                    type: "warning",
                    onClose: () => setPopupMessage(null)
                });
                setLoading(false); 
                return;
            }

            const assignedAppIds = new Set(
                Array.isArray(templateModules) ? templateModules.map(module => module.appId) : []
            );

            const applicationStatusUpdates = [];
            const templateApplicationAssignments = [];

            if (!assignedAppIds.has(selectedParentApp)) {
                templateApplicationAssignments.push({
                    templateId: Number(selectedTemplate),
                    appId: selectedParentApp,
                    status: "y"  
                });
            }

            childApplications.forEach(child => {
                const appId = child.appId;
                const isChecked = child.checked;
                const status = isChecked ? "y" : "n";
                const isAssigned = assignedAppIds.has(appId);

                if (isAssigned) {
                    applicationStatusUpdates.push({
                        appId: appId,
                        status: status
                    });
                } else if (isChecked) {
                    templateApplicationAssignments.push({
                        templateId: Number(selectedTemplate),
                        appId: appId,
                        lastChgBy: 0,
                        orderNo: 1,
                        status: "y"
                    });
                } else {
                    applicationStatusUpdates.push({
                        appId: appId,
                        status: "n" 
                    });
                }
            });

            const allTemplateApps = await getRequest(`${ASSIGN_TEMPLATES}/getAllTemplateById/${selectedTemplate}`);
            if (allTemplateApps?.response) {
                allTemplateApps.response.forEach(app => {
                    const appId = app.appId;
                    if (appId === selectedParentApp) return;

                    const childApp = childApplications.find(child => child.appId === appId);
                    if (childApp && !childApp.checked) {
                        const hasUpdate = applicationStatusUpdates.some(update => update.appId === appId);
                        if (!hasUpdate) {
                            applicationStatusUpdates.push({
                                appId: appId,
                                status: "n"  
                            });
                        }
                    }
                });
            }

            if (applicationStatusUpdates.length === 0 && templateApplicationAssignments.length === 0) {
                setPopupMessage({
                    message: "No changes detected to apply.",
                    type: "info",
                    onClose: () => setPopupMessage(null)
                });
                setLoading(false); 
                return;
            }

            const payload = {
                applicationStatusUpdates: applicationStatusUpdates,
                templateApplicationAssignments: templateApplicationAssignments
            };

            const response = await postRequest(`${MAS_APPLICATION}/assignUpdateTemplate`, payload);

            if (response) {
                if (response.status === 200 || response.status === 207) {
                    const message = response.data || "Assign template to application successfully";

                    setPopupMessage({
                        message: message,
                        type: response.status === 200 ? "success" : "warning",
                        onClose: () => {
                            setPopupMessage(null);
                            handleParentApplicationSelect({ target: { value: selectedParentApp } });
                        }
                    });
                } else {
                    throw new Error(response.message || "Failed to process request");
                }
            } else {
                throw new Error("No response received from server");
            }
        } catch (error) {
            console.error("Error saving template application:", error);

            setPopupMessage({
                message: error.message || "Failed to assign template to application",
                type: "error",
                onClose: () => setPopupMessage(null)
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const renderNestedItem = (item) => {
        const indentStyle = {
            paddingLeft: `${item.nestLevel * 20}px`,
            display: 'flex',
            alignItems: 'center'
        };

        const displayText = item.displayName;

        return (
            <tr key={item.srNo} className={`${item.isParent ? "bg-gray-50" : ""} hover:bg-gray-100`}>
                <td className="p-3 border">{item.srNo}</td>
                <td className="p-3 border">
                    <div style={indentStyle}>
                        {item.isParent && (
                            <button
                                onClick={() => handleToggleExpand(item.appId)}
                                className="mr-2 p-1 hover:bg-blue-100 rounded"
                            >
                                {item.expanded ? (
                                    <ChevronDownIcon className="h-4 w-4 text-blue-600" />
                                ) : (
                                    <ChevronRightIcon className="h-4 w-4 text-blue-600" />
                                )}
                            </button>
                        )}
                        <span className={`${item.isParent ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                            {displayText}
                        </span>
                    </div>
                </td>
                <td className="p-3 border text-center">
                    <input
                        type="checkbox"
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        checked={item.checked}
                        onChange={() => handleFeatureToggle(item.appId)}
                    />
                </td>
            </tr>
        );
    };

    if (loading) {
        return <LoadingComponent />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-2xl font-semibold mb-6 text-gray-800">Assign Application To Template</h1>

            {popupMessage && (
                <Popup
                    message={popupMessage.message}
                    type={popupMessage.type}
                    onClose={popupMessage.onClose}
                />
            )}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Template Name <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                            onChange={handleTemplateSelect}
                            value={selectedTemplate}
                        >
                            <option value="" disabled>Select Template</option>
                            {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.templateName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <button
                            type="button"
                            className="w-full bg-blue-900 text-white py-3 px-4 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center"
                            onClick={handleAddClick}
                        >
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Application
                        </button>
                    </div>
                </div>

                {showModuleSection && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Module Name
                            </label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                onChange={handleParentApplicationSelect}
                                value={selectedParentApp}
                            >
                                <option value="" disabled>Select Parent Application</option>
                                {parentApplications.map((app) => (
                                    <option key={app.id} value={app.id}>
                                        {app.applicationName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {selectedTemplate && (
                    <div className="mb-6">
                        <h6 className="text-lg font-semibold mb-4 text-gray-700">Template Modules</h6>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 border border-gray-200 text-left font-semibold">Sr No</th>
                                        <th className="p-3 border border-gray-200 text-left font-semibold">Assigned Module</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templateModules.length > 0 ? (
                                        templateModules.map((item) => (
                                            <tr key={item.srNo} className="hover:bg-gray-50">
                                                <td className="p-3 border border-gray-200">{item.srNo}</td>
                                                <td className="p-3 border border-gray-200">{item.module}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2" className="p-3 border border-gray-200 text-center text-gray-500">
                                                No modules assigned to this template
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {showModuleSection && showModuleTable && (
                    <div>
                        <h6 className="text-lg font-semibold mb-4 text-gray-700">Child Applications</h6>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 border border-gray-200 text-left font-semibold">Sr No</th>
                                        <th className="p-3 border border-gray-200 text-left font-semibold">Assigned Module</th>
                                        <th className="p-3 border border-gray-200 text-left font-semibold">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                                                    checked={childApplications.length > 0 && childApplications.every(item => item.checked)}
                                                    onChange={handleSelectAllFeatures}
                                                />
                                                Select All
                                            </label>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {childApplications.length > 0 ? (
                                        childApplications
                                            .filter(item => {
                                                if (!item.parentHierarchy) return true;
                                                const parentChain = item.parentHierarchy.split(" -> ");
                                                let currentPath = "";

                                                for (let i = 0; i < parentChain.length; i++) {
                                                    if (i > 0) currentPath += " -> ";
                                                    currentPath += parentChain[i];

                                                    const ancestor = childApplications.find(
                                                        app => app.displayName === currentPath
                                                    );

                                                    if (ancestor && !ancestor.expanded) {
                                                        return false;
                                                    }
                                                }

                                                return true;
                                            })
                                            .map(item => renderNestedItem(item))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="p-3 border border-gray-200 text-center text-gray-500">
                                                No child applications found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button
                                type="button"
                                className="bg-blue-900 text-white py-2.5 px-6 rounded-lg hover:bg-blue-800 transition-colors flex items-center"
                                onClick={handleSave}
                            >
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignApplication;