import React, { useState, useEffect, useCallback } from "react";
import { postRequest, putRequest, getRequest } from "../API/apiService";
import { MAS_TEMPLATE, ASSIGN_TEMPLATES, MAS_APPLICATION } from "../API/apiConfig";
import LoadingComponent from '../Components/LoadingComponent';
import {
    PlusCircleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from '@heroicons/react/24/solid';
import Popup from "../Components/Popup";
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';

const AssignApplication = () => {
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

    // State for tracking data loading
    const [isLoading, setIsLoading] = useState(false);
    
    // State for translated placeholders
    const [translatedPlaceholders, setTranslatedPlaceholders] = useState({
        selectTemplate: 'Select Template',
        selectParentApplication: 'Select Parent Application',
        selectAll: 'Select All',
    });

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
    const [error, setError] = useState(null);

    // Debug log
    useEffect(() => {
        console.log('🔍 AssignApplication Component - Language Status:', {
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
                    selectTemplate: 'Select Template',
                    selectParentApplication: 'Select Parent Application',
                    selectAll: 'Select All',
                });
                return;
            }

            // Only update if language changed
            const selectTemplatePlaceholder = await translatePlaceholder('Select Template');
            const selectParentApplicationPlaceholder = await translatePlaceholder('Select Parent Application');
            const selectAllPlaceholder = await translatePlaceholder('Select All');

            setTranslatedPlaceholders({
                selectTemplate: selectTemplatePlaceholder,
                selectParentApplication: selectParentApplicationPlaceholder,
                selectAll: selectAllPlaceholder,
            });
        };
        
        updatePlaceholders();
    }, [currentLanguage, translatePlaceholder, isTranslationNeeded]);

    useEffect(() => {
        fetchTemplates(1);
        fetchParentApplications();
    }, []);

    const fetchParentApplications = async () => {
        setIsLoading(true);
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
                console.log('✅ Parent applications loaded');
            }
        } catch (err) {
            console.error("Error fetching parent applications:", err);
            setError("Failed to fetch parent applications. Please try again later.");
            showPopup('Failed to load parent applications', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async (flag = 1) => {
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

            setTemplates(mappedTemplates);
            console.log('✅ Templates loaded');
        } catch (err) {
            console.error("Error fetching templates:", err);
            setError("Failed to fetch templates. Please try again later.");
            showPopup('Failed to load templates', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const processChildApplications = (apps, parentPath = "", srNoStart = 1) => {
        let result = [];
        let currentSrNo = srNoStart;

        if (!apps || !Array.isArray(apps)) return result;

        for (const app of apps) {
            const displayPath = parentPath ? `${parentPath}->${app.name}` : app.name;

            const isChecked = app.assigned === true && app.status?.toLowerCase() === 'y';

            const currentApp = {
                srNo: currentSrNo++,
                module: app.name,
                displayName: displayPath,
                templateId: app.templateId || null,
                appId: app.appId,
                status: app.status?.toLowerCase() || 'n',
                lastChgDate: app.lastChgDate,
                checked: isChecked,
                assigned: app.assigned,
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
        setIsLoading(true);

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
            showPopup("Failed to load child applications", "error");
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleTemplateSelect = async (e) => {
        const selectedTemplateId = e.target.value;
        setSelectedTemplate(selectedTemplateId);
        setIsLoading(true);

        try {
            const response = await getRequest(`${ASSIGN_TEMPLATES}/getAllTemplateById/${selectedTemplateId}`);

            if (response && response.response) {
                const formattedData = response.response.map((template, index) => {
                    return {
                        srNo: index + 1,
                        module: template.appName || <AutoTranslate>Unknown Module</AutoTranslate>,
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
            showPopup("Failed to load template details", "error");
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = () => {
        setIsEditMode(!isEditMode);
    };

    const handleAddClick = () => {
        if (!selectedTemplate) {
            showPopup("You must select a template first.", "warning");
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

    const showPopup = (message, type = 'info') => {
        setPopupMessage({
            message,
            type,
            onClose: () => {
                setPopupMessage(null);
            }
        });
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);

            // Validate required fields
            if (!selectedTemplate) {
                showPopup("Please select a template first.", "warning");
                setIsLoading(false);
                return;
            }

            if (!selectedParentApp) {
                showPopup("Please select a parent application first.", "warning");
                setIsLoading(false);
                return;
            }

            if (childApplications.length === 0) {
                showPopup("No child applications available to update.", "warning");
                setIsLoading(false);
                return;
            }

            const assignedAppMap = new Map();

            if (Array.isArray(templateModules)) {
                templateModules.forEach(module => {
                    assignedAppMap.set(module.appId, {
                        templateId: module.templateId,
                        status: module.status
                    });
                });
            }

            childApplications.forEach(child => {
                if (child.assigned) {
                    assignedAppMap.set(child.appId, {
                        templateId: child.templateId || Number(selectedTemplate),
                        status: child.status
                    });
                }
            });

            const assignedAppIds = new Set(assignedAppMap.keys());

            const applicationStatusUpdates = [];
            const templateApplicationAssignments = [];

            const getAllDescendantIds = (apps) => {
                const ids = new Set();
                const traverse = (appList) => {
                    appList.forEach(app => {
                        ids.add(app.appId);
                        if (app.children && app.children.length > 0) {
                            traverse(app.children);
                        }
                    });
                };
                traverse(apps);
                return ids;
            };

            const managedAppIds = new Set(childApplications.map(child => child.appId));
            managedAppIds.add(selectedParentApp);

            console.log("Currently managing these app IDs:", Array.from(managedAppIds));

            const processedAppIds = new Set();

            // Process parent application
            const isParentAssigned = assignedAppIds.has(selectedParentApp);
            if (!isParentAssigned) {
                templateApplicationAssignments.push({
                    templateId: Number(selectedTemplate),
                    appId: selectedParentApp,
                    lastChgBy: 0,
                    orderNo: 1,
                    status: "y"
                });
                processedAppIds.add(selectedParentApp);
            } else {
                applicationStatusUpdates.push({
                    templateId: Number(selectedTemplate),
                    appId: selectedParentApp,
                    status: "y"
                });
                processedAppIds.add(selectedParentApp);
            }

            // Process child applications
            childApplications.forEach(child => {
                const appId = child.appId;
                const isChecked = child.checked;
                const isAssigned = assignedAppIds.has(appId);
                const newStatus = isChecked ? "y" : "n";

                if (isAssigned) {
                    applicationStatusUpdates.push({
                        templateId: Number(selectedTemplate),
                        appId: appId,
                        status: newStatus
                    });
                } else if (isChecked) {
                    templateApplicationAssignments.push({
                        templateId: Number(selectedTemplate),
                        appId: appId,
                        lastChgBy: 0,
                        orderNo: 1,
                        status: "y"
                    });
                }
            });

            try {
                const allTemplateApps = await getRequest(`${ASSIGN_TEMPLATES}/getAllTemplateById/${selectedTemplate}`);
                if (allTemplateApps?.response) {
                    allTemplateApps.response.forEach(app => {
                        const appId = app.appId;

                        if (!managedAppIds.has(appId)) {
                            console.log(`Skipping ${appId} - not in current parent hierarchy`);
                            return;
                        }

                        const alreadyProcessed =
                            applicationStatusUpdates.some(update => update.appId === appId) ||
                            templateApplicationAssignments.some(assign => assign.appId === appId);

                        if (!alreadyProcessed) {
                            applicationStatusUpdates.push({
                                templateId: Number(selectedTemplate),
                                appId: appId,
                                status: "n"
                            });
                            console.log(`Setting ${appId} to inactive - was assigned but not in current view`);
                        }
                    });
                }
            } catch (error) {
                console.error("Error checking existing assignments:", error);
            }

            // Validate we have something to update
            if (applicationStatusUpdates.length === 0 && templateApplicationAssignments.length === 0) {
                showPopup("No changes detected to apply.", "info");
                setIsLoading(false);
                return;
            }

            const payload = {
                applicationStatusUpdates: applicationStatusUpdates,
                templateApplicationAssignments: templateApplicationAssignments
            };

            console.log("=== SAVE PAYLOAD ===");
            console.log("Managed App IDs:", Array.from(managedAppIds));
            console.log("Status Updates:", applicationStatusUpdates);
            console.log("New Assignments:", templateApplicationAssignments);
            console.log("===================");

            const response = await postRequest(`${MAS_APPLICATION}/assignUpdateTemplate`, payload);

            if (response) {
                if (response.status === 200 || response.status === 207) {
                    const message = response.data || "Template assigned to applications successfully";

                    showPopup(message, response.status === 200 ? "success" : "warning");

                    // Refresh the data to reflect changes
                    if (selectedTemplate) {
                        handleTemplateSelect({ target: { value: selectedTemplate } });
                    }
                    if (selectedParentApp) {
                        handleParentApplicationSelect({ target: { value: selectedParentApp } });
                    }
                } else {
                    throw new Error(response.message || "Failed to process request");
                }
            } else {
                throw new Error("No response received from server");
            }
        } catch (error) {
            console.error("Error saving template application:", error);
            showPopup(error.message || "Failed to assign template to application", "error");
        } finally {
            setIsLoading(false);
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

    // Show loading only if initial data is loading
    if (isLoading) {
        return <LoadingComponent />;
    }

    return (
        <div className="px-2">
            <h1 className="text-2xl font-semibold mb-6 text-gray-800">
                <AutoTranslate>Assign Application To Template</AutoTranslate>
            </h1>

            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="mb-4 bg-slate-100 p-4 rounded-lg">

                    {popupMessage && (
                        <Popup
                            message={popupMessage.message}
                            type={popupMessage.type}
                            onClose={popupMessage.onClose}
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <AutoTranslate>Template</AutoTranslate><AutoTranslate> Name</AutoTranslate> <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                onChange={handleTemplateSelect}
                                value={selectedTemplate}
                            >
                                <option value="" disabled>
                                    <AutoTranslate>{translatedPlaceholders.selectTemplate}</AutoTranslate>
                                </option>
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
                                <AutoTranslate>Application</AutoTranslate>
                            </button>
                        </div>
                    </div>

                    {showModuleSection && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
                            <div className="md:col-span-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <AutoTranslate>Module Name</AutoTranslate>
                                </label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                    onChange={handleParentApplicationSelect}
                                    value={selectedParentApp}
                                >
                                    <option value="" disabled>
                                        <AutoTranslate>{translatedPlaceholders.selectParentApplication}</AutoTranslate>
                                    </option>
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
                            <h6 className="text-lg font-semibold mb-4 text-gray-700">
                                <AutoTranslate>Template Modules</AutoTranslate>
                            </h6>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 border border-gray-200 text-left font-semibold">
                                                <AutoTranslate>Sr No</AutoTranslate>
                                            </th>
                                            <th className="p-3 border border-gray-200 text-left font-semibold">
                                                <AutoTranslate>Assigned Module</AutoTranslate>
                                            </th>
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
                                                    <AutoTranslate>No modules assigned to this template</AutoTranslate>
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
                            <h6 className="text-lg font-semibold mb-4 text-gray-700">
                                <AutoTranslate>Child Applications</AutoTranslate>
                            </h6>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-3 border border-gray-200 text-left font-semibold">
                                                <AutoTranslate>Sr No</AutoTranslate>
                                            </th>
                                            <th className="p-3 border border-gray-200 text-left font-semibold">
                                                <AutoTranslate>Assigned Module</AutoTranslate>
                                            </th>
                                            <th className="p-3 border border-gray-200 text-left font-semibold">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                                                        checked={childApplications.length > 0 && childApplications.every(item => item.checked)}
                                                        onChange={handleSelectAllFeatures}
                                                    />
                                                    <AutoTranslate>{translatedPlaceholders.selectAll}</AutoTranslate>
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
                                                    <AutoTranslate>No child applications found</AutoTranslate>
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
                                    <AutoTranslate>Save</AutoTranslate>
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AssignApplication;