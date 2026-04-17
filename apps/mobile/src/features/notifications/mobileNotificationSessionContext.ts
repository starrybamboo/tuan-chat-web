import { createContext } from "react";

import type { MobileNotificationSessionContextValue } from "./mobile-notification-session";

export const MobileNotificationSessionContext = createContext<MobileNotificationSessionContextValue | null>(null);
