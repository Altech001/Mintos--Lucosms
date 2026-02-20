import {
  BanknoteArrowUpIcon,
  HistoryIcon,
  LayoutTemplate,
  MailIcon,
  MessageCircleHeartIcon,
  SettingsIcon,
  Share2Icon,
  StoreIcon,
  UsersIcon,
  Film,
  UploadCloud
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { ChevronDownIcon } from "../icons";


type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  pro?: boolean;
  new?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};



const navItems: NavItem[] = [
  {
    icon: <StoreIcon />,
    name: "Home",
    path: "/",
  },
  {
    icon: <MailIcon />,
    name: "Compose Message",
    path: "/composemsg",
  },
  {
    icon: <LayoutTemplate />,
    name: "Templates",
    subItems: [
      { name: "List Templates", path: "/templates", pro: false },
      { name: "Creating Template", path: "/tpage", pro: false },
    ],
  },
  {
    name: "Recent History",
    icon: <HistoryIcon />,
    path: "/history",
  },
  {
    name: "TopUp Account",
    icon: <BanknoteArrowUpIcon />,
    path: "/autotopup",
  },
];

const othersItems: NavItem[] = [
  {
    icon: <SettingsIcon />,
    name: "Extensions",

    subItems: [
      { name: "Settings", path: "/settings", pro: false },
      { name: "Transcations", path: "/billings", pro: true },
      { name: "Contacts Folder", path: "/contacts", pro: false, new: true },
      { name: "Tickets", path: "/tickets", pro: false, new: true },
      { name: "Developer", path: "/developers", pro: false },
      { name: "Documentation", path: "/api_doc", pro: false },
    ],
  },
];

const developerItems: NavItem[] = [
  {
    name: "Special Message",
    icon: <MessageCircleHeartIcon />,
    path: "/special-message",
  }
];

const adminItems: NavItem[] = [
  {
    name: "User Management",
    icon: <UsersIcon />,
    path: "/admin/users",
  },
  {
    name: "Movies Editor",
    icon: <Film />,
    path: "/admin/movies",
  }, {
    name: "Series Editor",
    icon: <Film />,
    path: "/admin/series",
  },
  {
    name: "Series Batcher",
    icon: <UploadCloud />,
    path: "/admin/series-batcher",
  },
  {
    name: "Share Credits",
    icon: <Share2Icon />,
    path: "/share-credits",
    new: true
  }
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  // Generate avatar URL based on user email or name
  const getAvatarUrl = () => {
    const seed = user?.email || user?.fullName || 'default';
    // Using DiceBear API for avatars - multiple styles available
    return `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,8b5cf6,ec4899,f59e0b,10b981`;
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others" | "admin" | "developer";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    const allMenus: {
      type: "main" | "others" | "admin" | "developer";
      items: NavItem[];
    }[] = [
        { type: "main", items: navItems },
        { type: "developer", items: developerItems },
        { type: "others", items: othersItems },
      ];
    if (user?.isSuperuser) {
      allMenus.push({ type: "admin", items: adminItems });
    }

    allMenus.forEach(({ type, items }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type, index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, user?.isSuperuser]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (
    index: number,
    menuType: "main" | "others" | "admin" | "developer"
  ) => {
    if (!isExpanded && !isMobileOpen) {
      toggleSidebar();
    }
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others" | "admin" | "developer"
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name} className="relative group/tooltip">
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active rounded-none"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active rounded-none"
                  : "menu-item-icon-inactive rounded-none"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isMobileOpen) && (
                  <>
                    <span className="menu-item-text">{nav.name}</span>
                    <span className="flex items-center gap-1 ml-auto">
                      {nav.new && (
                        <span
                          className={`ml-auto ${isActive(nav.path || "")
                            ? "menu-dropdown-badge-active rounded-none"
                            : "menu-dropdown-badge-inactive rounded-none"
                            } menu-dropdown-badge`}
                        >
                          new
                        </span>
                      )}
                      {nav.pro && (
                        <span
                          className={`ml-auto ${isActive(nav.path || "")
                            ? "menu-dropdown-badge-active rounded-none"
                            : "menu-dropdown-badge-inactive rounded-none"
                            } menu-dropdown-badge`}
                        >
                          pro
                        </span>
                      )}
                    </span>
                  </>
                )}
              </Link>
            )
          )}
          {/* Tooltip - only visible when sidebar is collapsed */}
          {!isExpanded && !isMobileOpen && (
            <div className="fixed left-[90px] ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-none shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 whitespace-nowrap z-[9999] pointer-events-none"
              style={{ top: 'auto', transform: 'translateY(-50%)' }}
            >
              {nav.name}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
            </div>
          )}
          {nav.subItems && (isExpanded || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300 rounded-none"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-10 flex flex-col lg:mt-0 top-0 px-6 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[250px]"
          : "w-[80px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    >
      <div
        className={`py-6 flex flex-col items-center ${!isExpanded ? "lg:justify-center" : "justify-center"
          }`}
      >
        <Link to="/" className="flex flex-row items-center gap-3">
          {/* Circular Avatar */}
          <div className={`${isExpanded || isMobileOpen ? "w-20 h-20" : "w-12 h-12"} rounded-full overflow-hidden border-4 border-primary shadow-lg transition-all duration-300`}>
            <img
              src={getAvatarUrl()}
              alt={user?.fullName || user?.email || "User"}
              className="w-full h-full object-cover"
            />
          </div>

          {/* LUCOSMS Text - Only show when expanded */}
          {(isExpanded || isMobileOpen) && (
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
                LUCOSMS
              </h3>
              {/* <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user?.fullName || user?.email || "User"}
              </p> */}
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-4">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex text-gray-400 ${!isExpanded
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              ></h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="">
              {renderMenuItems(developerItems, "developer")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex  text-gray-400 ${!isExpanded
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              ></h2>
              {renderMenuItems(othersItems, "others")}
            </div>

            {user?.isSuperuser && (
              <div className="mt-6">
                <h2
                  className={`mb-4 text-xs uppercase flex text-gray-400 ${!isExpanded
                    ? "lg:justify-center"
                    : "justify-start"
                    }`}
                >
                  Admin
                </h2>
                {renderMenuItems(adminItems, "admin")}
              </div>
            )}
          </div>
        </nav>
        {isExpanded || isMobileOpen}
      </div>
    </aside>
  );
};

export default AppSidebar;
