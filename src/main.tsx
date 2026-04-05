import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import AutoSave from "./components/AutoSave";

createRoot(document.getElementById("root")!).render(
	<>
		<App />
		<AutoSave />
	</>
);
