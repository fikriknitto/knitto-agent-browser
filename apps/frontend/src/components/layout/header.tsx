import { Button, ThemeToggle } from "@knittotextile/react-ui";
import { setApiDataToken } from "@/lib/api-data/token";
import { useUserLogin } from "@/lib/hooks/use-user-login";
import { toggleSidebar } from "@/redux/layoutSlice";
import type { RootState } from "@/redux/store";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import HamburgerIcon from "@/components/ui/icon/hamburger";
import type { ISidebarMenu, ISidebarMenuItem } from "./sidebar";
import "./header-theme-toggle.css";

const parsedMenu = (menu: ISidebarMenuItem[]) => {
  let result: { label: string; url: string }[] = [];
  menu.forEach(({ label, url, children }) => {
    result.push({ label, url: url || "" });
    if (children) result = result.concat(parsedMenu(children));
  });
  return result;
};

function Header({ sidebar }: { sidebar: ISidebarMenu[] }) {
  const location = useLocation();
  const { data: userLogin } = useUserLogin();
  const connectionState = useSelector((s: RootState) => s.connection.connectionState);
  const bridgeAvailable = useSelector((s: RootState) => s.connection.bridgeAvailable);
  const splitPathUrl = location.pathname.split("/");
  const lastPath = splitPathUrl[splitPathUrl.length - 1];

  const allMenu = useMemo(() => sidebar.flatMap((item) => parsedMenu(item.menu)), [sidebar]);
  const textTitle =
    allMenu.find(({ url }) => url.endsWith(lastPath))?.label ||
    sidebar?.[0]?.menu?.[0]?.label ||
    "";

  return (
    <header className="z-999 h-13 fixed top-0 left-0 right-0 flex justify-between px-[.875rem] bg-navy-100 header">
      <TitleHeader menuName={textTitle} />
      <div className="flex gap-x-[.625rem] items-center">
        <span className="text-xs text-white/80 hidden sm:inline">
          WS {connectionState}
          {bridgeAvailable ? " · bridge ok" : ""}
        </span>
        <ThemeToggle className="header-theme-toggle" />
        <Button variant="outline" color="white" size="sm" rounded>
          {userLogin?.username || "User"}
        </Button>
        <Button
          color="burnt-orange"
          onClick={() => {
            setApiDataToken(null);
            document.location = "/login";
          }}
          size="sm"
          rounded
        >
          Log out
        </Button>
      </div>
    </header>
  );
}

function TitleHeader({ menuName }: { menuName: string }) {
  const dispatch = useDispatch();
  return (
    <div className="flex items-center gap-x-6">
      <div
        className="w-6 h-6 flex justify-center cursor-pointer items-center"
        onClick={() => dispatch(toggleSidebar())}
        data-testid="toggle-sidebar"
      >
        <HamburgerIcon />
      </div>
      <div className="flex gap-x-2 items-center">
        <div className="subtitle-2 text-white! ">{menuName || ""}</div>
      </div>
    </div>
  );
}

export default Header;
