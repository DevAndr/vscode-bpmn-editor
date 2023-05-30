// CSS
import "./style.css";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "bpmn-js-color-picker-bt/colors/color-picker.css";

// External Modules
import BpmnModeler from "bpmn-js/lib/Modeler";
import BpmnColorPickerModule from "bpmn-js-color-picker-bt";
import { provideVSCodeDesignSystem, vsCodeButton } from "@vscode/webview-ui-toolkit";

// Libs
import { Navigator } from "./navigator";
import { ContentManager } from "./contentManager";
import { StateManager } from "./stateManager";
import { LoaderManager } from "./loaderManager";
import resizeAllModule from './resizer';

provideVSCodeDesignSystem().register(vsCodeButton());

const DEBUG = false;

// Setup
const stateManager = new StateManager();
const loaderManager = new LoaderManager(stateManager);


const modeler = new BpmnModeler({
  container: "#canvas",
  keyboard: { bindTo: document },
  additionalModules: [BpmnColorPickerModule, resizeAllModule],
});

const navigation = new Navigator(modeler, stateManager);
const contentManager = new ContentManager(modeler);

// Helpers
async function openXML(content) {
  DEBUG && console.debug("[BPMN_Editor.Webview] Loading changes");

  if (!content) {
    DEBUG &&
      console.debug("[BPMN_Editor.Webview] Empty diagram, saving template");
    await contentManager.newDiagram();
    sendChanges();
  } else {
    await contentManager.loadDiagram(content);
    // Persist in cache
    stateManager.updateState({ content });
  }

  // Persist state information.
  // This state is returned in the call to `vscode.getState` below when a webview is reloaded.
  stateManager.updateState({ content });
}

function sendChanges() {
  DEBUG && console.debug("[BPMN_Editor.Webview] Sending changes");

  contentManager.exportDiagram().then((text) => {
    stateManager.sendUpdateXML(text);
    stateManager.updateState({ content: text });
  });
}

// Listeners

function setupListeners() {
  DEBUG && console.debug("[BPMN_Editor.Webview] Setting up listeners");
  // VSCode API listeners
  window.addEventListener("message", async (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "updateXML":
        DEBUG &&
          console.debug(
            "[BPMN_Editor.Webview] Updating event from editor: ",
            message
          );
        openXML(message.text);
        return;
      case "loadXML":
        break;
      default:
        DEBUG &&
          console.debug(
            "[BPMN_Editor.Webview] Unknown message type: ",
            message
          );
    }
  });

  // Auto save on XML Change
  modeler.get("eventBus").on("commandStack.changed", sendChanges);

  // Navigation listeners
  navigation.startListeners();
}

 function setEncoded(link, name, data) {
    let encodedData = encodeURIComponent(data);
    console.log(link);
    

    if (data) {

      // window.open('data:application/bpmn20-xml;charset=UTF-8,' + encodedData);
      // link.setAttribute('class', 'active').setAttribute(
        // 'href', 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData)
        // .setAttribute('download', `${name}`);
    } else {
      // link.removeClass('active');
    }
  }

// Init
async function init() { 
  DEBUG && console.debug("[BPMN_Editor.Webview] Initializing");

  // Load last state
  const state = await loaderManager.initialState;
  DEBUG &&
    console.debug("[BPMN_Editor.Webview] Initializing with state: ", state);
  await openXML(state.content);
  if (state.rootNodeId) navigation.setRootNodeId(state.rootNodeId);
  if (state.viewBox) navigation.setViewBox(state.viewBox);
  setupListeners();

  const downloadSvg = document.querySelector('#js-download-diagram');
  downloadSvg?.addEventListener("click", async(e) => {
    console.log('downloadSvg', e.target);  

    try {
      const { svg } = await modeler.saveSVG();
      let elem = e.target;

      if(elem.tagName != 'A' || !elem.querySelector('a')) {
        let encodedData = encodeURIComponent(svg);

        let a = document.createElement('a');
        a.innerText = '...';
        a.download = 'diagram.svg';
        a.href = 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData; 
  
        a.click();

        a.remove();        
      } 
    } catch (err) {
      console.error('Error happened saving svg: ', err);
    }
  });
}


window.addEventListener("load", init);