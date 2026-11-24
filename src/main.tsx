import React from "react";
import ReactDOM from "react-dom/client";
import { IonApp, setupIonicReact } from "@ionic/react";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import App from "./AccountApp";
import "./styles.css";
setupIonicReact({ mode: "ios" });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>,
);
