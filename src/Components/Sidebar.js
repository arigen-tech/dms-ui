import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  InboxIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  DocumentChartBarIcon,
  DocumentMinusIcon,
  DocumentMagnifyingGlassIcon,
  DocumentIcon,
  KeyIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  ComputerDesktopIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  IdentificationIcon,
  ClockIcon
} from "@heroicons/react/24/solid";
import { SiArchiveofourown } from "react-icons/si";
import {
  RiFileUserFill,
  RiInboxUnarchiveFill,
  RiMenuSearchLine,
  RiInboxArchiveFill,
  RiArchiveStackFill,
} from "react-icons/ri";
import { IoDocumentLock } from "react-icons/io5";
import { AiOutlineFileSearch } from "react-icons/ai";
import { MdAdfScanner } from "react-icons/md";
import { FaUserClock } from "react-icons/fa6";
import { GiFiles } from "react-icons/gi";
import logo3 from "../Assets/logo3.png";
import {
  API_HOST,
  SYSTEM_ADMIN,
  BRANCH_ADMIN,
  DEPARTMENT_ADMIN,
  USER,
} from "../API/apiConfig";
import { UserIcon } from "lucide-react";
import { getRequest } from "../API/apiService";
import AutoTranslate from "../i18n/AutoTranslate";
import { useLanguage } from "../i18n/LanguageContext";
import { getFallbackTranslation, translateText, translationCache } from "../i18n/autoTranslator";

function Sidebar({ roleChanged }) {
  const location = useLocation();
  const { currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [openMenus, setOpenMenus] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPlaceholder, setSearchPlaceholder] = useState("Search Menu...");
  const [translationDictionary, setTranslationDictionary] = useState({});

  const sidebarRef = useRef(null);

  const rolesId = localStorage.getItem("currRoleId") || sessionStorage.getItem("currRoleId");
  const role = localStorage.getItem("role");

  const cacheKey = `menuCache-${rolesId}`;

  // Update search placeholder when language changes
  useEffect(() => {
    const placeholders = {
      'en': 'Search Menu...',
      'hi': 'मेनू खोजें...',
      'or': 'ମେନୁ ଖୋଜନ୍ତୁ...',
      'mr': 'मेनू शोध...'
    };
    setSearchPlaceholder(placeholders[currentLanguage] || "Search Menu...");
  }, [currentLanguage]);

  // Load translation dictionary for search
  useEffect(() => {
    const loadTranslationDictionary = () => {
      try {
        // Get all cached translations from localStorage
        const cached = localStorage.getItem('translationCache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setTranslationDictionary(parsed);
        }
      } catch (error) {
        console.error("Error loading translation dictionary:", error);
      }
    };

    loadTranslationDictionary();
  }, []);

  // Function to search in all languages
  const searchInAllLanguages = useCallback((menuItem, term) => {
    if (!term.trim()) return true;
    
    const searchTermLower = term.toLowerCase();
    const menuName = menuItem.name;
    
    // Check English name
    if (menuName.toLowerCase().includes(searchTermLower)) {
      return true;
    }
    
    // Check all languages in translation dictionary
    const languages = ['hi', 'or', 'mr'];
    for (const lang of languages) {
      const cacheKey = `${menuName}_${lang}`;
      const translatedText = translationDictionary[cacheKey];
      
      if (translatedText && translatedText.toLowerCase().includes(searchTermLower)) {
        return true;
      }
    }
    
    // Check fallback translations
    for (const lang of languages) {
      const fallbackTranslation = getFallbackTranslation(menuName, lang);
      if (fallbackTranslation && fallbackTranslation.toLowerCase().includes(searchTermLower)) {
        return true;
      }
    }
    
    // Check children recursively
    if (menuItem.children && menuItem.children.length > 0) {
      return menuItem.children.some(child => searchInAllLanguages(child, term));
    }
    
    return false;
  }, [translationDictionary]);

  // Fetch menu data
  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const data = await getRequest(`/dynamic-sidebar/getAllUrlByRoles/${rolesId}`);
      if (data?.status === 200 && Array.isArray(data.response)) {
        setMenuData(data.response);
        sessionStorage.setItem(cacheKey, JSON.stringify(data.response));

        // Initialize open menus
        const initialOpenMenus = {};
        data.response.forEach((item) => {
          if (item.children?.length > 0) {
            const storedState = localStorage.getItem(`menu-${item.appId}-open`);
            initialOpenMenus[item.appId] = storedState ? JSON.parse(storedState) : false;
          }
        });
        setOpenMenus(initialOpenMenus);

        // Build allowed URLs
        const extractUrls = (items) => {
          let urls = [];
          for (const item of items) {
            if (item.url && item.url !== "#") {
              urls.push(item.url);
            }
            if (item.children?.length > 0) {
              urls.push(...extractUrls(item.children));
            }
          }
          return urls;
        };
        const allowedUrls = extractUrls(data.response);
        sessionStorage.setItem("allowedUrls", JSON.stringify(allowedUrls));
        
        // Preload translations for all menu items
        preloadMenuTranslations(data.response);
      } else {
        console.error("Unexpected API response format:", data);
        setMenuData([]);
      }
    } catch (error) {
      console.error("Error fetching Menu data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Preload translations for menu items
  const preloadMenuTranslations = async (menuItems) => {
    try {
      const languages = ['hi', 'or', 'mr'];
      const allMenuTexts = [];
      
      const extractMenuTexts = (items) => {
        for (const item of items) {
          if (item.name) {
            allMenuTexts.push(item.name);
          }
          if (item.children && item.children.length > 0) {
            extractMenuTexts(item.children);
          }
        }
      };
      
      extractMenuTexts(menuItems);
      
      // Remove duplicates
      const uniqueTexts = [...new Set(allMenuTexts)];
      
      // Preload translations for each language
      for (const lang of languages) {
        if (lang !== 'en') {
          for (const text of uniqueTexts) {
            // Trigger translation to cache it
            translateText(text, lang);
          }
        }
      }
    } catch (error) {
      console.error("Error preloading menu translations:", error);
    }
  };

  // On mount / rolesId or roleChanged change
  useEffect(() => {
    let canceled = false;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached && !roleChanged && !canceled) {
      try {
        const parsed = JSON.parse(cached);
        setMenuData(parsed);
        const initialOpenMenus = {};
        parsed.forEach((item) => {
          if (item.children?.length > 0) {
            const storedState = localStorage.getItem(`menu-${item.appId}-open`);
            initialOpenMenus[item.appId] = storedState ? JSON.parse(storedState) : false;
          }
        });
        setOpenMenus(initialOpenMenus);
        setLoading(false);
        
        // Preload translations
        preloadMenuTranslations(parsed);
        
        return () => (canceled = true);
      } catch (err) {
        console.warn("Menu cache parse failed, refetching", err);
      }
    }

    fetchMenuData();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChanged, rolesId]);

  // Persist scroll position
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      try {
        sessionStorage.setItem("sidebarScroll", String(sidebar.scrollTop || 0));
      } catch (e) {}
    };

    sidebar.addEventListener("scroll", handleScroll);
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll after menuData is present
  useEffect(() => {
    if (!sidebarRef.current) return;
    if (loading) return;
    if (!menuData || menuData.length === 0) return;

    const saved = sessionStorage.getItem("sidebarScroll");
    if (saved) {
      requestAnimationFrame(() => {
        try {
          sidebarRef.current.scrollTop = parseInt(saved, 10) || 0;
        } catch (e) {}
      });
    }
  }, [loading, menuData]);

  // Counts state
  const [counts, setCounts] = useState(() => {
    const savedCounts = sessionStorage.getItem("counts");
    return savedCounts
      ? JSON.parse(savedCounts)
      : {
          totalUser: 0,
          branchUser: 0,
          totalDocument: 0,
          pendingDocument: 0,
          storageUsed: 0,
          totalBranches: 0,
          totalDepartment: 0,
          totalRoles: 0,
          totalFilesType: 0,
          documentType: 0,
          annualYear: 0,
          totalNullEmployeeType: 0,
          totalCategories: 0,
          totalApprovedDocuments: 0,
          totalRejectedDocuments: 0,
          totalPendingDocuments: 0,
          totalApprovedDocumentsById: 0,
          totalRejectedDocumentsById: 0,
          totalPendingDocumentsById: 0,
          totalDocumentsById: 0,
          totalApprovedStatusDocById: 0,
          totalRejectedStatusDocById: 0,
          departmentCountForBranch: 0,
          nullRoleEmployeeCountForBranch: 0,
          departmentUser: 0,
          rejectedDocsbyid: 0,
          approvedDocsbyid: 0,
          pendingDocsbyid: 0,
          createdByCount: 0,
          nullRoleEmployeeCountForDepartment: 0,
          totalDocumentsByDepartmentId: 0,
          totalPendingDocumentsByDepartmentId: 0,
          totalApprovedStatusDocByDepartmentId: 0,
          totalRejectedStatusDocByDepartmentId: 0,
          totalUserApplications: 0,
          totalTemplate: 0,
        };
  });

  // Fetch counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const employeeId = localStorage.getItem("userId");
        const token = localStorage.getItem("tokenKey");

        if (!employeeId) {
          throw new Error("Employee ID not found in local storage.");
        }

        const response = await axios.get(
          `${API_HOST}/api/dashboard/getAllCount/${employeeId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setCounts(response.data);
        sessionStorage.setItem("counts", JSON.stringify(response.data));
      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
      }
    };

    fetchCounts();
  }, []);

  // Menu toggle handler
  const handleMenuToggle = (appId) => {
    const newState = !openMenus[appId];
    setOpenMenus((prev) => ({ ...prev, [appId]: newState }));
    localStorage.setItem(`menu-${appId}-open`, JSON.stringify(newState));
  };

  // Active link style
  const isActive = (path) =>
    location.pathname === path
      ? "bg-blue-950 text-white"
      : "text-white hover:bg-blue-950 hover:text-white";

  // Icon mapping
  const getIconComponent = (name) => {
    const iconMap = {
      Dashboard: InboxIcon,
      "Archival Dashboard": SiArchiveofourown,
      Users: UserGroupIcon,
      "Pending Users": FaUserClock,
      "Manage Users Roles": UserPlusIcon,
      "Generate I'D Card": IdentificationIcon,
      Organisation: BuildingOfficeIcon,
      Branch: KeyIcon,
      Department: ComputerDesktopIcon,
      Role: UserCircleIcon,
      Category: ShoppingCartIcon,
      Years: CalendarDaysIcon,
      "Manage User Applications": UserIcon,
      "Template Masters": UserIcon,
      "Add Form Reports": UserIcon,
      "Audit Form": UserIcon,
      "assign applications": UserIcon,
      "Role Rights": UserIcon,
      "Files Types": GiFiles,
      Document: DocumentIcon,
      "Pending Approvals": IoDocumentLock,
      "Approved Document": DocumentCheckIcon,
      "Rejected Document": DocumentMinusIcon,
      "Search Documents": DocumentMagnifyingGlassIcon,
      "File Compare": DocumentMagnifyingGlassIcon,
      "Search Documents By QR Codes": DocumentTextIcon,
      "Report Section": DocumentChartBarIcon,
      "Document Report": DocumentTextIcon,
      "User Report": RiFileUserFill,
      "O C R": AiOutlineFileSearch,
      "Search OCR": RiMenuSearchLine,
      "Archive Section": RiArchiveStackFill,
      "Download Archive Data": RiInboxArchiveFill,
      "Upload Archive Data": RiInboxUnarchiveFill,
      "Archival Policy": ClockIcon,
      "Scan Document": MdAdfScanner,
      "Upload Document": DocumentArrowUpIcon,
      "Main Dashboard": InboxIcon,
    };

    return iconMap[name] || DocumentIcon;
  };

  // Get count for menu item
  const getCountForMenuItem = (url) => {
    const currentRole = localStorage.getItem("role");

    const countMap = {
      "/users": counts.totalUser,
      "/userRoleAssing": counts.totalNullEmployeeType,
      "/manageUserRole": counts.totalUser - counts.totalNullEmployeeType,
      "/create-branch": counts.totalBranches,
      "/create-department": counts.totalDepartment,
      "/create-role": counts.totalRoles,
      "/create-category": counts.totalCategories,
      "/create-year": counts.annualYear,
      "/ManageUserApplications": counts.totalUserApplications,
      "/TemplateMasters": counts.totalTemplate,
      "/create-fileType": counts.totalFilesType,
      "/approve-documents":
        currentRole === SYSTEM_ADMIN
          ? counts.totalPendingDocuments
          : currentRole === BRANCH_ADMIN
          ? counts.totalPendingDocumentsById
          : currentRole === DEPARTMENT_ADMIN
          ? counts.totalPendingDocumentsByDepartmentId
          : counts.pendingDocsbyid,
      "/all-documents": currentRole === USER ? counts.pendingDocsbyid : 0,
      "/total-approved":
        currentRole === SYSTEM_ADMIN
          ? counts.totalApprovedDocuments
          : currentRole === BRANCH_ADMIN
          ? counts.totalApprovedStatusDocById
          : currentRole === DEPARTMENT_ADMIN
          ? counts.totalApprovedStatusDocByDepartmentId
          : 0,
      "/approvedDocs": currentRole === USER ? counts.approvedDocsbyid : 0,
      "/total-rejected":
        currentRole === SYSTEM_ADMIN
          ? counts.totalRejectedDocuments
          : currentRole === BRANCH_ADMIN
          ? counts.totalRejectedStatusDocById
          : currentRole === DEPARTMENT_ADMIN
          ? counts.totalRejectedStatusDocByDepartmentId
          : counts.rejectedDocsbyid,
      "/rejectedDocs": currentRole === USER ? counts.rejectedDocsbyid : 0,
      "/branchusers": counts.branchUser,
      "/Departmentusers": counts.departmentUser,
    };

    return countMap[url] || 0;
  };

  // Sidebar Link component
  const SidebarLink = ({ to, icon: Icon, text, count }) => (
    <Link
      to={to}
      onClick={() => {
        try {
          if (sidebarRef.current) sessionStorage.setItem("sidebarScroll", String(sidebarRef.current.scrollTop || 0));
        } catch (e) {}
      }}
      className={`px-3 py-1 rounded-lg text-base font-lg flex items-center justify-between ${isActive(to)}`}
    >
      <div className="flex items-center">
        <Icon className="h-5 w-5 mr-3" />
        <span>
          <AutoTranslate>{text}</AutoTranslate>
        </span>
      </div>
      {count > 0 && (
        <span className="bg-red-600 text-white rounded-2xl px-2 text-sm font-semibold">
          {count}
        </span>
      )}
    </Link>
  );

  // Render menu items with multilingual search
  const renderMenuItems = (items) => {
    // Filter items based on multilingual search
    const filteredItems = items.filter((item) =>
      searchInAllLanguages(item, searchTerm)
    );

    const sortedItems = [...filteredItems].sort((a, b) => a.serialNo - b.serialNo);

    return sortedItems.map((item) => {
      const IconComponent = getIconComponent(item.name);
      const hasChildren = item.children && item.children.length > 0;
      const isOpen = openMenus[item.appId] || false;

      if (hasChildren) {
        // Check if parent or any child should be shown
        const shouldShowParent = searchTerm.trim() === '' || searchInAllLanguages(item, searchTerm);

        if (!shouldShowParent) return null;

        return (
          <div key={item.appId}>
            <button
              onClick={() => handleMenuToggle(item.appId)}
              className="w-full px-3 py-1 rounded-lg text-base flex items-center justify-between text-white hover:bg-blue-950 hover:text-white mt-2"
            >
              <div className="flex items-center">
                <IconComponent className="h-5 w-5 mr-3" />
                <AutoTranslate>{item.name}</AutoTranslate>
              </div>
              {isOpen ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </button>
            {isOpen && <div className="ml-2 flex flex-col space-y-1">{renderMenuItems(item.children)}</div>}
          </div>
        );
      } else {
        // Only show leaf items that match search
        if (searchTerm.trim() !== '' && !searchInAllLanguages(item, searchTerm)) {
          return null;
        }

        return (
          <SidebarLink
            key={item.appId}
            to={item.url}
            icon={IconComponent}
            text={item.name}
            count={getCountForMenuItem(item.url)}
          />
        );
      }
    });
  };

  // Handle search input change
  const handleInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div
      ref={sidebarRef}
      className="max-h-[100%] overflow-y-auto print:max-h-none print:overflow-auto h-screen flex flex-col justify-between bg-blue-verticle text-white p-1 transition-all duration-300 overflow-hidden hover:overflow-y-auto custom-scrollbar hover-scrollbar"
    >
      <div>
        <div className="flex items-center border-b border-t justify-center mb-2">
          <img className="flex w-30 h-30" src={logo3} alt="DMS" />
        </div>
        <nav className="flex flex-col space-y-1">
          <div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              name="name"
              value={searchTerm}
              onChange={handleInputChange}
              maxLength={30}
              className="mt-1 block w-full p-1 mb-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400"
            />
          </div>

          {loading ? (
            <div className="text-center py-4">
              <AutoTranslate>Loading menu...</AutoTranslate>
            </div>
          ) : (
            renderMenuItems(menuData)
          )}
        </nav>
      </div>
    </div>
  );
}

export default Sidebar;