import CalendarSettings from "./pages/CalendarSettings";
import ClientDetail from "./pages/ClientDetail";
import Clients from "./pages/Clients";
import Deadlines from "./pages/Deadlines";
import Documents from "./pages/Documents";
import Financial from "./pages/Financial";
import Home from "./pages/Home";
import NotificationSettings from "./pages/NotificationSettings";
import ProcessDetail from "./pages/ProcessDetail";
import Processes from "./pages/Processes";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";
import Templates from "./pages/Templates";
import __Layout from "./Layout.jsx";

export const PAGES = {
  CalendarSettings: CalendarSettings,
  ClientDetail: ClientDetail,
  Clients: Clients,
  Deadlines: Deadlines,
  Documents: Documents,
  Financial: Financial,
  Home: Home,
  NotificationSettings: NotificationSettings,
  ProcessDetail: ProcessDetail,
  Processes: Processes,
  Settings: Settings,
  Tasks: Tasks,
  Templates: Templates,
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};
