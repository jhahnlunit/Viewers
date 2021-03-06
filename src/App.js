import './config';

import { OidcProvider, reducer as oidcReducer } from 'redux-oidc';
import React, { Component } from 'react';
import { combineReducers, createStore } from 'redux';
import {
  getDefaultToolbarButtons,
  getUserManagerForOpenIdConnectClient,
  initWebWorkers,
} from './utils/index.js';

import ConnectedToolContextMenu from './connectedComponents/ConnectedToolContextMenu';
import OHIF from 'ohif-core';
import OHIFCornerstoneExtension from '@ohif/extension-cornerstone';
import OHIFDicomHtmlExtension from 'ohif-dicom-html-extension';
import OHIFDicomMicroscopyExtension from 'ohif-dicom-microscopy-extension';
import OHIFDicomPDFExtension from 'ohif-dicom-pdf-extension';
import OHIFStandaloneViewer from './OHIFStandaloneViewer';
import OHIFVTKExtension from '@ohif/extension-vtk';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import WhiteLabellingContext from './WhiteLabellingContext';
import setupTools from './setupTools';
import ui from './redux/ui.js';

const { ExtensionManager } = OHIF.extensions;
const { reducers, localStorage } = OHIF.redux;

reducers.ui = ui;
reducers.oidc = oidcReducer;

const combined = combineReducers(reducers);
const store = createStore(combined, localStorage.loadState());

store.subscribe(() => {
  localStorage.saveState({
    preferences: store.getState().preferences,
  });
});

setupTools(store);

const children = {
  viewport: [<ConnectedToolContextMenu />],
};

/** TODO: extensions should be passed in as prop as soon as we have the extensions as separate packages and then registered by ExtensionsManager */
const extensions = [
  new OHIFCornerstoneExtension({ children }),
  new OHIFVTKExtension(),
  new OHIFDicomPDFExtension(),
  new OHIFDicomHtmlExtension(),
  new OHIFDicomMicroscopyExtension(),
];
ExtensionManager.registerExtensions(store, extensions);

// TODO[react] Use a provider when the whole tree is React
window.store = store;

function handleServers(servers) {
  if (servers) {
    OHIF.utils.addServers(servers, store);
  }
}

class App extends Component {
  static propTypes = {
    routerBasename: PropTypes.string.isRequired,
    relativeWebWorkerScriptsPath: PropTypes.string.isRequired,
    servers: PropTypes.object.isRequired,
    oidc: PropTypes.array,
    whiteLabelling: PropTypes.object,
  };

  static defaultProps = {
    whiteLabelling: {},
    oidc: [],
  };

  constructor(props) {
    super(props);

    //
    const defaultButtons = getDefaultToolbarButtons(this.props.routerBasename);
    const buttonsAction = OHIF.redux.actions.setAvailableButtons(
      defaultButtons
    );

    store.dispatch(buttonsAction);

    if (this.props.oidc.length) {
      const firstOpenIdClient = this.props.oidc[0];

      this.userManager = getUserManagerForOpenIdConnectClient(
        store,
        firstOpenIdClient
      );
    }
    handleServers(this.props.servers);
    initWebWorkers(
      this.props.routerBasename,
      this.props.relativeWebWorkerScriptsPath
    );
  }

  render() {
    const userManager = this.userManager;

    if (userManager) {
      return (
        <Provider store={store}>
          <OidcProvider store={store} userManager={userManager}>
            <Router basename={this.props.routerBasename}>
              <WhiteLabellingContext.Provider value={this.props.whiteLabelling}>
                <OHIFStandaloneViewer userManager={userManager} />
              </WhiteLabellingContext.Provider>
            </Router>
          </OidcProvider>
        </Provider>
      );
    }

    return (
      <Provider store={store}>
        <Router basename={this.props.routerBasename}>
          <WhiteLabellingContext.Provider value={this.props.whiteLabelling}>
            <OHIFStandaloneViewer />
          </WhiteLabellingContext.Provider>
        </Router>
      </Provider>
    );
  }
}

export default App;
