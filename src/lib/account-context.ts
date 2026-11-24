import { createContext, useContext } from "react";
import type { SaveStatus } from "./save-queue";
export type Account = {
  email: string | null;
  status: SaveStatus;
  error: string;
  busy: boolean;
  hasLegacy: boolean;
  logout: () => Promise<void>;
  showDemo: () => Promise<void>;
  returnToPlan: () => void;
  retry: () => void;
  reload: () => void;
  importLegacy: () => void;
};
export const AccountContext = createContext<Account>(null!);
export const useAccount = () => useContext(AccountContext);
