/* eslint-disable */
/* REQUIREMENTS */
import * as Rx from 'rxjs';
import axios from 'axios';
const assign = require('object-assign');
// ACTIONS
import { SET_FILTER_VALUE, SET_FILTER_COLUMN, loadError, updateStyleTjsBtn, GET_TJS_FRAMEWORK, getTJSFramework, getTJSDatasets, GET_TJS_DATASETS, SET_DATASET_SELECTED, setLayer2TJS, getSLDLayer, GET_SLD_LAYER, SET_SLD_SELECTED, JOIN_LAYER_TJS, joinLayer } from './actions';
const { ADD_LAYER, REMOVE_NODE, changeLayerProperties, SELECT_NODE, addLayer, addGroup, moveNode, LAYER_LOAD } = require('mapstore2/web/client/actions/layers');
const { MAP_CONFIG_LOADED } = require('mapstore2/web/client/actions/config');
// SELECTORS
import {layersSelector, getSelectedLayers, getLayerFromId, groupsSelector} from 'mapstore2/web/client/selectors/layers';
// UTILS
const { find, get, set, uniq, isArray, cloneDeep, findIndex } = require("lodash");
import API from '../assets/TJS';
import { describeFeatureType } from 'mapstore2/web/client/api/WFS';
import { getCapabilities } from 'mapstore2/web/client/api/WMS';

/* PRIVATE FUNCTIONS */
/**
 * find the cfg key of the plugin
 */
const getCFG = (key) => {
    var tjsCFG = document.querySelector('#tjsCFG');
    if (tjsCFG) {
        var tt = tjsCFG.getAttribute(key);
        if (['true', 'false'].indexOf(tt.toLowerCase()) > -1) tt = !!JSON.parse(String(tt).toLowerCase());
        return tt;
    }
    return null;
}

/**
 * function to homogenize capabilities error of all request
 * @param {*} error
 */
const getCapabilitiesERROR = (error, type, callbacks) => {
    console.log(type + ' Getcapabilities doesn t succeed')
    // Get capabilities not succeed
    console.log(error);
    if (getCFG('verbose')) {
        console.groupEnd()
    }
    // Return list of observable actions
    return callbacks;
}

/* EPICS HOOKS */
const onSelectLayerDisplayTJSButton = (action$, store) => {
    // on each SELECT_NODE action triggered
    return action$.ofType(SELECT_NODE)
        .switchMap((action) => {
            // Find layersSelected
            const state = store.getState();
            var selectedLayers = getSelectedLayers(state);
            // executed if only one layer is selected
            if (selectedLayers.length === 1 && selectedLayers[0]) {
                // Find the current layer
                var layer = getLayerFromId(state, selectedLayers[0].id);
                if (getCFG('verbose')) {
                    console.group('| TJSPlugin | onSelectLayerDisplayTJSButton')
                    console.log('init layer state ->')
                    console.dir(cloneDeep(layer))
                    console.groupEnd()
                }
                var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
                // no tjsManagement field -> don't show the button
                if (tjsManagement) {
                    return Rx.Observable.from([
                        setLayer2TJS(layer),
                        updateStyleTjsBtn({display: "block"})
                    ]);
                }
            }
            // WARNING - ACTION DOESN T SEEM TO WORK
            return Rx.Observable.from([
                setLayer2TJS(null),
                updateStyleTjsBtn({display: "none"})
            ]);
        });
};

const onAddLayerFindTJSFramework = (action$, store) => {
    // on each ADD_LAYER try to find if it is possible de make a join tjs with it
    return action$.ofType(ADD_LAYER)
            .switchMap((addLayerAction) =>
                action$.ofType(LAYER_LOAD)
                    .take(1) // <-------------------- very important!
                    .switchMap((action) => {
                        // Find layer in store
                        var layer = getLayerFromId(store.getState(), addLayerAction.layer.id);
                        if (getCFG('verbose')) {
                            console.group('| TJSPlugin | onAddLayerFindTJSFramework')
                            console.log('init layer state ->')
                            console.dir(cloneDeep(layer))
                        }

                        // Check service of the layer
                        if (layer && layer.url && layer.type && ['wms', 'wfs'].indexOf(layer.type) > -1) {
                            if (getCFG('verbose')) {
                                console.log('Trigger - getTJSFramework');
                                console.groupEnd();
                            }
                            return Rx.Observable.of(getTJSFramework(layer.id));
                        }
                        return Rx.Observable.empty();
                    })
            )
};

const onGetTJSFramework = (action$, store) => {
    // on action from UI
    return action$.ofType(GET_TJS_FRAMEWORK)
        .mergeMap((action) => {
            // Find layer in store
            var layer = getLayerFromId(store.getState(), action.id);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onGetTJSFramework')
                console.log('init layer state ->')
                console.log(cloneDeep(layer))
            }
            // Don't look at previous tjsManagement -> override
            var url = layer.url.replace(/wfs|wms/g, "tjs");
            // Start with getCapatabilities
            return Rx.Observable.defer(() => API.getCapabilities(url))
                .switchMap(function(response) {
                    // Response error ?
                    if (getCFG('verbose')) {
                        console.group('describeFrameworks TJS and describeFeatureType WFS');
                    }
                    // Response only status 200 (other are in catch error)
                    // Get match between WFS featureType and FrameworkURI
                    var requests = [
                        API.describeFrameworks(url),
                        describeFeatureType(layer.url, layer.name)
                    ];
                    return Rx.Observable.defer(() => axios.all(requests))
                        .switchMap(function(responses) {
                            // Reset TJS management
                            var tjsManagement = {
                                layerName: responses[1].featureTypes[0].typeName,
                                layerWorkspace: responses[1].targetNamespace,
                                url: url
                            };
                            // Loop over each Framework founded
                            if (responses[0].FrameworkDescriptions && responses[0].FrameworkDescriptions.Framework) {
                                if (Array.isArray(responses[0].FrameworkDescriptions.Framework)) {
                                    responses[0].FrameworkDescriptions.Framework.forEach(function(framework) {
                                        // isMatch ?
                                        if ( framework.FrameworkURI && framework.FrameworkURI === (tjsManagement.layerWorkspace + '/' + tjsManagement.layerName) ) {
                                            tjsManagement.FrameworkURI = framework.FrameworkURI;
                                            tjsManagement.FrameworkKey = framework.FrameworkKey.Column.$['name'];
                                        }
                                    })
                                } else {
                                    // isMatch ?
                                    var framework = responses[0].FrameworkDescriptions.Framework;
                                    if ( framework.FrameworkURI && framework.FrameworkURI === (tjsManagement.layerWorkspace + '/' + tjsManagement.layerName) ) {
                                        tjsManagement.FrameworkURI = framework.FrameworkURI;
                                        tjsManagement.FrameworkKey = framework.FrameworkKey.Column.$['name'];
                                    }
                                }
                            }
                            // Set tjsManagement to the layer if all matches worked
                            var actions = [];
                            if (tjsManagement.FrameworkURI) {
                                // Style loading
                                tjsManagement.sld = {
                                    loading: true
                                };
                                // Add tjsManagement
                                actions.push(changeLayerProperties(action.id, {
                                    extendedParams: layer.extendedParams ? assign(layer.extendedParams, {
                                        tjsManagement: tjsManagement
                                    }) : {
                                        tjsManagement: tjsManagement
                                    }
                                }));
                                // Add dimension "TJS" for icon
                                if (layer.dimensions && find(layer.dimensions, {name: "tjs"}) === undefined) {
                                    layer.dimensions.push({
                                        name: "tjs",
                                        layerId: action.id
                                    })
                                }
                                actions.push(changeLayerProperties(action.id, {
                                    dimensions: layer.dimensions ? layer.dimensions : [{
                                        name: "tjs",
                                        layerId: action.id
                                    }]
                                }));
                                // Get Datasets and SLDs in the same time
                                actions.push(getTJSDatasets(action.id));
                                actions.push(getSLDLayer(action.id));
                                if (getCFG('verbose')) {
                                    console.log('new layer properties ->')
                                    console.dir(tjsManagement);
                                    console.dir(layer.dimensions ? layer.dimensions : [{
                                        name: "tjs",
                                        layerId: action.id
                                    }]);
                                    console.log('Trigger changeLayerProperties, getTJSDatasets, getSLDLayer');
                                    console.groupEnd();
                                    console.groupEnd();
                                }
                                return Rx.Observable.from(actions);
                            } else {
                                console.log('No framework founded -> no tjs management for the layer');
                                if (getCFG('verbose')) {
                                    console.groupEnd();
                                    console.groupEnd();
                                }
                                // Layer as already an extendedParams ?
                                if (layer.extendedParams && layer.extendedParams.tjsManagement) {
                                    actions.push(changeLayerProperties(action.id, {
                                        extendedParams: assign(layer.extendedParams, {
                                            tjsManagement: undefined
                                        })
                                    }));
                                }
                                // Remove dimension TJS if exist
                                actions.push(changeLayerProperties(action.id, {
                                    dimensions: layer.dimensions ? layer.dimensions.filter((item) => {return item.name != "tjs"}) : []
                                }));
                                return Rx.Observable.from(actions);
                            }
                        })
                        .catch(function(e) {
                            console.log('One request doesn t succeed describeFrameworks or describeFeatureType WFS')
                            // One service is not available WFS or TJS describeFrameworks
                            console.log(e);
                            if (getCFG('verbose')) {
                                console.groupEnd();
                                console.groupEnd();
                            }
                            // If error, reset tjsManagement
                            if (layer.extendedParams && layer.extendedParams.tjsManagement) {
                                // Reset
                                return Rx.Observable.of(changeLayerProperties(action.id, {
                                    extendedParams: assign(layer.extendedParams, {
                                        tjsManagement: undefined
                                    }),
                                    dimensions: layer.dimensions ? layer.dimensions.filter((item) => {return item.name != "tjs"}) : []
                                }));
                            }
                            return Rx.Observable.empty();
                        })
                })
                .catch(function(e) {
                    var callbacks = [];
                    if (layer.extendedParams && layer.extendedParams.tjsManagement) {
                        callbacks.push(changeLayerProperties(action.id, {
                            extendedParams: assign(layer.extendedParams, {
                                tjsManagement: undefined
                            }),
                            dimensions: layer.dimensions ? layer.dimensions.filter((item) => {return item.name != "tjs"}) : []
                        }));
                    }
                    return Rx.Observable.from(getCapabilitiesERROR(e, "TJS", callbacks));
                });
        });
};

const onGetTJSDatasets = (action$, store) => {
    // triggered when a layer has the capacity to be joinded and has framewokrs
    return action$.ofType(GET_TJS_DATASETS)
        .switchMap((action) => {
            // Find the layer
            var layer = getLayerFromId(store.getState(), action.id);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onGetTJSDatasets')
                console.log('init layer state ->')
                console.log(cloneDeep(layer))
            }
            // Current layer has tjsManagement ?
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            if (tjsManagement && tjsManagement.FrameworkURI && tjsManagement.url) {
                // Start with getCapatabilities (should be fast due to cache)
                return Rx.Observable.defer(() => API.getCapabilities(tjsManagement.url))
                    .switchMap(function(response) {
                        // Response error ?
                        if (response.error) throw response.error;
                        if (getCFG('verbose')) {
                            console.group('describeDatasets TJS');
                        }
                        // Response only status 200 (other are in catch error)
                        // Get all datasets associated
                        return Rx.Observable.defer(() => API.describeDatasets(tjsManagement.url, tjsManagement.FrameworkURI))
                            .switchMap(function(response) {
                                // Append datasets to the tjsManagement params
                                if (response && response.DatasetDescriptions && response.DatasetDescriptions.Framework && response.DatasetDescriptions.Framework.Dataset) {
                                    // Loop over each datasets
                                    var datasets = {
                                        list: []
                                    };
                                    if (isArray(response.DatasetDescriptions.Framework.Dataset)) {
                                        response.DatasetDescriptions.Framework.Dataset.forEach(function(dataset) {
                                            // Means raw dataset
                                            if (!dataset.DatasetURI.includes('DatasetURI')) {
                                                datasets.list.push({
                                                    title: dataset.Title,
                                                    DatasetURI: dataset.DatasetURI,
                                                    Documentation : dataset.Documentation
                                                })
                                            }
                                        })
                                    } else {
                                        // Means raw dataset
                                        if (!response.DatasetDescriptions.Framework.Dataset.DatasetURI.includes('DatasetURI')) {
                                            datasets.list.push({
                                                title: response.DatasetDescriptions.Framework.Dataset.Title,
                                                DatasetURI: response.DatasetDescriptions.Framework.Dataset.DatasetURI,
                                                Documentation : response.DatasetDescriptions.Framework.Dataset.Documentation
                                            })
                                        }
                                    }
                                    // Append
                                    tjsManagement.datasets = datasets;
                                    if (getCFG('verbose')) {
                                        console.log('new layer properties ->')
                                        console.dir(tjsManagement)
                                        console.groupEnd()
                                        console.groupEnd()
                                    }
                                    return Rx.Observable.of(changeLayerProperties(action.id, {
                                        extendedParams: assign(layer.extendedParams, {
                                            tjsManagement: tjsManagement
                                        })
                                    }))
                                } else {
                                    // No dataset founded
                                    console.log('TJS describeDatasets doesn t succeed')
                                    console.log(response)
                                    if (getCFG('verbose')) {
                                        console.groupEnd()
                                        console.groupEnd()
                                    }
                                    if (tjsManagement.datasets) {
                                        delete tjsManagement.datasets;
                                        return Rx.Observable.of(changeLayerProperties(action.id, {
                                            extendedParams: assign(layer.extendedParams, {
                                                tjsManagement: tjsManagement
                                            })
                                        }))
                                    }
                                    return Rx.Observable.empty();
                                }
                            })
                            .catch(function(e) {
                                console.log('TJS describeDatasets doesn t succeed')
                                // Erreur avec le servide DescribeDatasets
                                console.log(e);
                                if (getCFG('verbose')) {
                                    console.groupEnd()
                                    console.groupEnd()
                                }
                                var actions = [loadError(e.message)];
                                if (tjsManagement.datasets) {
                                    delete tjsManagement.datasets;
                                    actions.push(changeLayerProperties(action.id, {
                                        extendedParams: assign(layer.extendedParams, {
                                            tjsManagement: tjsManagement
                                        })
                                    }))
                                }
                                // Que faire des erreurs ?
                                return Rx.Observable.from(actions);
                            })
                    })
                    .catch(function(e) {
                        return Rx.Observable.from(getCapabilitiesERROR(e, "TJS", [loadError(e.message)]));
                    });
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const onGetSLDLayer = (action$, store) => {
    // triggered when a layer has the capacity to be joinded and has framewokrs -> find sld styles
    return action$.ofType(GET_SLD_LAYER)
        .switchMap((action) => {
            // Find the layer
            const state = store.getState();
            var layer = getLayerFromId(state, action.id);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onGetSLDLayer')
                console.log('init layer state ->')
                console.dir(cloneDeep(layer))
            }
            // Current layer has tjsManagement ?
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            if (tjsManagement && tjsManagement.url) {
                // Change url to wms capabilities - to improve
                var url = tjsManagement.url.replace('tjs', 'wms');
                // Start with getCapatabilities (should be fast due to cache)
                return Rx.Observable.defer(() => getCapabilities(url))
                    .switchMap(function(response) {
                        if (getCFG('verbose')) {
                            console.group('analyze style on wms capabilities')
                        }
                        // Response only status 200 (other are in catch error)
                        if (response && response.capability && response.capability.layer && response.capability.layer.layer) {
                            var wmsLayer = find(response.capability.layer.layer, {name: layer.name});
                            var sld = {
                                list: [{
                                    title: "Style par défaut",
                                    name: "default"
                                }]
                            };
                            if (wmsLayer && wmsLayer.style) {
                                wmsLayer.style.forEach(function(style) {
                                    sld.list.push({
                                        name: style.name,
                                        title: style.title
                                    })
                                })
                            }
                            // Append
                            if (getCFG('verbose')) {
                                console.log('new layer properties ->')
                                console.dir(tjsManagement)
                                console.groupEnd()
                                console.groupEnd()
                            }
                            tjsManagement.sld = sld;
                            return Rx.Observable.of(changeLayerProperties(action.id, {
                                extendedParams: assign(layer.extendedParams, {
                                    tjsManagement: tjsManagement
                                })
                            }))
                        }
                        // Layer not found in WMS
                        console.log('WMS get capabilities to find style doesn t succeed')
                        console.log(response);
                        if (getCFG('verbose')) {
                            console.groupEnd()
                            console.groupEnd()
                        }
                        if (tjsManagement.sld) {
                            delete tjsManagement.sld;
                            return Rx.Observable.of(changeLayerProperties(action.id, {
                                extendedParams: assign(layer.extendedParams, {
                                    tjsManagement: tjsManagement
                                })
                            }))
                        }
                        return Rx.Observable.empty();
                    })
                    .catch(function(e) {
                        var callbacks = [];
                        if (tjsManagement.sld) {
                            delete tjsManagement.sld;
                            callbacks.push(changeLayerProperties(action.id, {
                                extendedParams: assign(layer.extendedParams, {
                                    tjsManagement: tjsManagement
                                })
                            }));
                        }
                        return Rx.Observable.from(getCapabilitiesERROR(e, "WMS", callbacks));
                    });
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const onSelectTJSDataset = (action$, store) => {
    // on each CREATE_NEW_FEATURE action triggered
    return action$.ofType(SET_DATASET_SELECTED)
        .switchMap((action) => {
            // Find the layer
            var layer = getLayerFromId(store.getState(), action.layerId);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onSelectTJSDataset')
                console.log('init layer state ->')
                console.dir(cloneDeep(layer))
            }
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            // Should have tjsManagement and other attributes
            if (tjsManagement && tjsManagement.FrameworkURI && tjsManagement.url && action.datasetURI && tjsManagement.datasets && tjsManagement.datasets.list) {
                // Find datasetSelected in tjsManagement config
                var datasetSelected = find(tjsManagement.datasets.list, { DatasetURI: action.datasetURI});
                if (!datasetSelected) {
                    alert('Dataset not found in the list:\n' + tjsManagement.datasets.list.map((l) => {return l + '\n'}).join('- '));
                    if (getCFG('verbose')) {
                        console.groupEnd()
                    }
                    return Rx.Observable.empty();
                }
                tjsManagement.datasets.selected = datasetSelected;
                // Start with getCapatabilities (should be fast due to cache)
                return Rx.Observable.defer(() => API.getCapabilities(tjsManagement.url))
                    .switchMap(function(response) {
                        // Response error ?
                        if (response.error) throw response.error;
                        // Response only status 200 (other are in catch error)
                        // Get DataDescription
                        return Rx.Observable.defer(() => API.describeData(tjsManagement.url, tjsManagement.FrameworkURI, action.datasetURI))
                            .switchMap(function(response) {
                                if (getCFG('verbose')) {
                                    console.group('describeData TJS')
                                }
                                // Analyze each columnSet
                                if (response && response.DataDescriptions &&
                                    response.DataDescriptions.Framework &&
                                    response.DataDescriptions.Framework.Dataset &&
                                    response.DataDescriptions.Framework.Dataset.Columnset &&
                                    response.DataDescriptions.Framework.Dataset.Columnset.Attributes &&
                                    response.DataDescriptions.Framework.Dataset.Columnset.Attributes.Column) {
                                    // Add datasetSelected to the plugin configuration
                                    var attributes = {
                                        list: []
                                    };
                                    // Get list of attributes
                                    try {
                                        // Reset
                                        tjsManagement.datasets.selected.attributes = undefined;
                                        response.DataDescriptions.Framework.Dataset.Columnset.Attributes.Column.forEach(function(attribute) {
                                            // Remove frameworkKey
                                            if (attribute.$['name'] != tjsManagement.FrameworkKey) {
                                                attributes.list.push({
                                                    "name": attribute.$['name'],
                                                    "title": attribute['Title'] == "" ? attribute.$['name'] : attribute['Title']
                                                });
                                            }
                                        })

                                        if (attributes.list.length > 0) {
                                            tjsManagement.datasets.selected.attributes = attributes;
                                        }

                                        if (getCFG('verbose')) {
                                            console.log('new layer properties ->')
                                            console.dir(cloneDeep(tjsManagement))
                                            console.groupEnd()
                                            console.groupEnd()
                                        }
                                        return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                                extendedParams: assign(layer.extendedParams, {
                                                    tjsManagement: tjsManagement
                                                })
                                            })
                                        );
                                    } catch (e) {
                                        console.log('Cannot access to attributes of the datasets')
                                        console.log(e)
                                        if (getCFG('verbose')) {
                                            console.groupEnd()
                                            console.groupEnd()
                                        }
                                        if (tjsManagement.datasets.selected.attributes) tjsManagement.datasets.selected.attributes = undefined;
                                        // No attributes
                                        return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                            extendedParams: assign(layer.extendedParams, {
                                                tjsManagement: tjsManagement
                                            })
                                        }));
                                    }
                                } else {
                                    // Attributes key not found ERROR
                                    alert('Cannot find attributes in the request describeData\n' + JSON.stringify(response));
                                    console.log(response)
                                    if (getCFG('verbose')) {
                                        console.groupEnd()
                                        console.groupEnd()
                                    }
                                    if (tjsManagement.datasets.selected.attributes) tjsManagement.datasets.selected.attributes = undefined;
                                    // No date attribute
                                    return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                        extendedParams: assign(layer.extendedParams, {
                                            tjsManagement: tjsManagement
                                        })
                                    }));
                                }
                            })
                            .catch(function(e) {
                                alert('DescribeData TJS doesn t succeed\n' + e.message);
                                console.log(e)
                                if (getCFG('verbose')) {
                                    console.groupEnd()
                                }
                                if (tjsManagement.datasets.selected.attributes) tjsManagement.datasets.selected.attributes = undefined;
                                // No date attribute
                                return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                    extendedParams: assign(layer.extendedParams, {
                                        tjsManagement: tjsManagement
                                    })
                                }));
                            })
                    })
                    .catch(function(e) {
                        return Rx.Observable.from(getCapabilitiesERROR(e, "TJS", []));
                    });
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }

        });
};

const onSelectSLDLayer = (action$, store) => {
    // on each SET_SLD_SELECTED action triggered
    return action$.ofType(SET_SLD_SELECTED)
        .switchMap((action) => {
            // Find the layer
            var layer = getLayerFromId(store.getState(), action.layerId);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onSelectSLDLayer')
                console.log('init layer state ->')
                console.log(cloneDeep(layer))
            }
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            // Should have tjsManagement and other attributes
            if (tjsManagement && tjsManagement.sld && tjsManagement.sld.list) {
                if (getCFG('verbose')) {
                    console.group('select sld style')
                }
                // Find datasetSelected in tjsManagement config
                var sldSelected = find(tjsManagement.sld.list, { name: action.sldName});
                if (!sldSelected) {
                    console.log('sld not found in the list')
                    return Rx.Observable.empty();
                }
                // Append
                tjsManagement.sld.selected = sldSelected;
                if (getCFG('verbose')) {
                    console.log('new layer propertiers ->')
                    console.dir(cloneDeep(tjsManagement))
                    console.groupEnd()
                    console.groupEnd()
                }
                return Rx.Observable.of(changeLayerProperties(action.id, {
                    extendedParams: assign(layer.extendedParams, {
                        tjsManagement: tjsManagement
                    })
                }));
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const onSelectFilterValue = (action$, store) => {
    // on each SET_FILTER_VALUE action triggered
    return action$.ofType(SET_FILTER_VALUE)
        .switchMap((action) => {
            // Find the layer
            var layer = getLayerFromId(store.getState(), action.layerId);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onSelectFilterValue')
                console.log('init layer state ->')
                console.dir(cloneDeep(layer))
            }
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            // Should have tjsManagement and other attributes
            if (tjsManagement && tjsManagement.datasets && tjsManagement.datasets.selected.attributes && tjsManagement.datasets.selected.attributes.filter && tjsManagement.datasets.selected.attributes.filter.filterList) {
                if (getCFG('verbose')) {
                    console.group('Value selection')
                }
                // Find datasetSelected in tjsManagement config
                if (tjsManagement.datasets.selected.attributes.filter.filterList.indexOf(action.filterValue) === -1) {
                    console.log('value not found in the list')
                    return Rx.Observable.empty();
                }
                // Append
                if (tjsManagement.datasets.selected.attributes.filter) {
                    tjsManagement.datasets.selected.attributes.filter.filterValue = action.filterValue;
                } else {
                    tjsManagement.datasets.selected.attributes.filter = {
                        filterValue : action.filterValue
                    };
                }

                if (getCFG('verbose')) {
                    console.log('new layer properties ->')
                    console.dir(cloneDeep(tjsManagement))
                }
                return Rx.Observable.of(changeLayerProperties(action.id, {
                    extendedParams: assign(layer.extendedParams, {
                        tjsManagement: tjsManagement
                    })
                }));
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const onSelectFilterColumn = (action$, store) => {
    // on each SET_FILTER_COLUMN action triggered
    return action$.ofType(SET_FILTER_COLUMN)
        .switchMap((action) => {
            // Find the layer
            var layer = getLayerFromId(store.getState(), action.layerId);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | onSelectFilterColumn')
                console.log('init layer state ->')
                console.dir(cloneDeep(layer))
            }
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            // Should have tjsManagement and other attributes
            if (tjsManagement && tjsManagement.datasets && tjsManagement.datasets.selected.attributes && tjsManagement.datasets.selected.attributes.list) {
                if (getCFG('verbose')) {
                    console.group('Filter Column selection')
                }
                // Find datasetSelected in tjsManagement config
                var filterColumn = find(tjsManagement.datasets.selected.attributes.list, { name: action.filterColumn});
                if (!filterColumn) {
                    if (getCFG('verbose')) {
                        console.log('Column not found in the list')
                    }
                    if (tjsManagement.datasets.selected.attributes.filter) delete tjsManagement.datasets.selected.attributes.filter;
                    // No Filter
                    return Rx.Observable.of(changeLayerProperties(action.layerId, {
                        extendedParams: assign(layer.extendedParams, {
                            tjsManagement: tjsManagement
                        })
                    }));
                }
                if (getCFG('verbose')) {
                    console.log('new layer properties ->')
                    console.dir(cloneDeep(tjsManagement))
                }
                return Rx.Observable.defer(() => API.getCapabilities(tjsManagement.url))
                    .switchMap(function(response) {
                        // Response error ?
                        if (response.error) throw response.error;
                        if (getCFG('verbose')) {
                            console.group('describeDatasets TJS');
                        }
                        // Response only status 200 (other are in catch error)
                        // Get Data of the attribute selected
                        return Rx.Observable.defer(() => API.getData(tjsManagement.url, tjsManagement.FrameworkURI, tjsManagement.datasets.selected.DatasetURI, filterColumn.name))
                            .switchMap((response) => {
                                if (response &&
                                    response.GDAS &&
                                    response.GDAS.Framework &&
                                    response.GDAS.Framework.Dataset &&
                                    response.GDAS.Framework.Dataset.Rowset &&
                                    response.GDAS.Framework.Dataset.Rowset.Row) {
                                        // Get unicity of values
                                        tjsManagement.datasets.selected.attributes.filter = {
                                            filterColumn: action.filterColumn,
                                            filterList: uniq(response.GDAS.Framework.Dataset.Rowset.Row.map(r => r.V))
                                        };
                                        if (getCFG('verbose')) {
                                            console.log('new layer properties ->')
                                            console.dir(cloneDeep(tjsManagement))
                                            console.groupEnd()
                                            console.groupEnd()
                                        }
                                        // Update property
                                        return Rx.Observable.of(changeLayerProperties(action.id, {
                                            extendedParams: assign(layer.extendedParams, {
                                                tjsManagement: tjsManagement
                                            })
                                        }));
                                }
                                // Data not found
                                alert('Cannot parse GDAS in the request getData\n' + JSON.stringify(response));
                                console.log(response)
                                if (getCFG('verbose')) {
                                    console.groupEnd()
                                    console.groupEnd()
                                }
                                if (tjsManagement.datasets.selected.attributes.filter) delete tjsManagement.datasets.selected.attributes.filter;
                                // No filter
                                return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                    extendedParams: assign(layer.extendedParams, {
                                        tjsManagement: tjsManagement
                                    })
                                }));
                            })
                            .catch((e) => {
                                alert('GetData TJS doesn t succeed\n' + e.message);
                                console.log(e)
                                if (getCFG('verbose')) {
                                    console.groupEnd()
                                }
                                if (tjsManagement.datasets.selected.attributes.filter) delete tjsManagement.datasets.selected.attributes.filter;
                                // No Filter
                                return Rx.Observable.of(changeLayerProperties(action.layerId, {
                                    extendedParams: assign(layer.extendedParams, {
                                        tjsManagement: tjsManagement
                                    })
                                }));
                            })
                    })
                    .catch(function(e) {
                        return Rx.Observable.from(getCapabilitiesERROR(e, "TJS", []));
                    });
            } else {
                if (getCFG('verbose')) {
                    console.groupEnd()
                }
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const joinDataTJS = (action$, store) => {
    // on each JOIN_LAYER_TJS action triggered
    return action$.ofType(JOIN_LAYER_TJS)
        .switchMap((action) => {
            // Find the layer
            var state = store.getState();
            var layer = getLayerFromId(state, action.id);
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | joinDataTJS')
                console.log('init layer state ->')
                console.log(cloneDeep(layer))
                console.groupEnd()
            }
            var tjsManagement = layer.extendedParams && layer.extendedParams.tjsManagement;
            // Should have tjsManagement and other attributes
            if (tjsManagement) {
                try {
                    var filter = {};
                    var style = undefined;
                    // Filter replacement
                    if (tjsManagement.datasets.selected.attributes.filter) {
                        // Date column attribute should be the last one inserted
                        filter.FilterColumn = tjsManagement.datasets.selected.attributes.filter.filterColumn;
                        filter.FilterValue  = tjsManagement.datasets.selected.attributes.filter.filterValue;
                    }
                    if (tjsManagement.sld.selected && tjsManagement.sld.selected.name !== 'default') {
                        style = tjsManagement.sld.selected.name;
                    }
                    // Post the request
                    return Rx.Observable.defer(() => API.joinData(tjsManagement.url, tjsManagement.FrameworkURI, tjsManagement.datasets.selected.DatasetURI, tjsManagement.datasets.selected.attributes.list.map(l => l.name), filter, style))
                        .switchMap(function(response) {
                            if (response && response.JoinDataResponse && response.JoinDataResponse.JoinedOutputs && response.JoinDataResponse.JoinedOutputs.Output) {
                                // Find the mechanism
                                var typeIndex = findIndex(response.JoinDataResponse.JoinedOutputs.Output, function(o) { return o.Mechanism.Identifier.toLowerCase() === layer.type.toLowerCase(); });
                                if (typeIndex === -1) {
                                    alert('Cannot find a join result for the service: ' + layer.type);
                                    return Rx.Observable.empty();
                                }
                                var output = response.JoinDataResponse.JoinedOutputs.Output[typeIndex];
                                try {
                                    // Group exist first ?
                                    var groupTJS = find(groupsSelector(state), {title: "Résultats TJS"});
                                    if (!groupTJS) {
                                        // Create the group and relaunch the action
                                        return Rx.Observable.of(
                                            addGroup("Résultats TJS", undefined, {
                                                id: 'tjs_resultat',
                                                name: "tjs_resultat",
                                                title: 'Résultats TJS',
                                                expanded: true
                                            }),
                                            joinLayer(layer.id)
                                        );
                                    }

                                    // Create the newLayer to add
                                    var domainIndex = findIndex(output.Resource.Parameter, function(p) {return p.$['name'] === 'domainName'});
                                    var typeNameIndex = findIndex(output.Resource.Parameter, function(p) {return ['typeName', 'layers'].indexOf(p.$['name']) > -1});

                                    // Modify attributes of the new layer
                                    var newLayer = cloneDeep(layer);
                                    newLayer.url = output.Resource && output.Resource.Parameter[domainIndex]['_'];
                                    newLayer.name = output.Resource && output.Resource.Parameter[typeNameIndex]['_'];
                                    newLayer.dimensions = [];
                                    newLayer.extendedParams.tjsManagement = undefined;
                                    newLayer.singleTile = true;
                                    // Remove layers properties
                                    var propertiesToRemove = getCFG('removeJoinLayerProperties').split(',');
                                    propertiesToRemove.forEach((property) => {
                                        set(newLayer, property, undefined)
                                    })
                                    // Documentation of dataset is geonetwork file ?
                                    // 3 cases
                                    // - not catalogURL for the layer and no documentation for the dataset => newLayer.catalogURL = undefined || ""
                                    // - catalogURL for the layer and no documentaion for the dataset => newLayer.catalogURL = undefined && newLayer.extendedParams.annexeCatalogURL = layer.catalogURL
                                    // - no catalogURL for the layer and documentation for the dataset => newLayer.catalogURL = newCatalogURL (from documentation parsing)
                                    // - catalogURL for the layer and documentation for the dataset => newLayer.catalogURL = newCatalogURL (from documentation parsing) && newLayer.extendedParams.annexeCatalogURL = layer.catalogURL;
                                    var newCatalogURL = undefined;
                                    if (tjsManagement.datasets.selected.Documentation.indexOf('/geonetwork/srv') > -1) {
                                        // /geonetwork/srv/fre/csw?request=GetRecordById&service=CSW&version=2.0.2&elementSetName=full&id=MT1346159122003
                                        var params = new URLSearchParams(tjsManagement.datasets.selected.Documentation);
                                        var idCatalog = params.get('id');
                                        newCatalogURL = tjsManagement.datasets.selected.Documentation;
                                        if (idCatalog === null) {
                                            // Two possibilities of URL type
                                            var idGeonetworkPath = newCatalogURL.indexOf('/geonetwork/srv');
                                            var documentationURL = newCatalogURL.slice(idGeonetworkPath);
                                            documentationURL = documentationURL.split('/');
                                            if (documentationURL.includes('api') && documentationURL.includes('records')) {
                                                // https://georchestra.geo-hyd.net/geonetwork/srv/api/records/MT1346159122003/formatters/xml
                                                idCatalog = documentationURL[documentationURL.indexOf('records') + 1];
                                            } else if (documentationURL.includes('metadata')) {
                                                // https://georchestra.geo-hyd.net/geonetwork/srv/fre/catalog.search#/metadata/MT1346159122003
                                                idCatalog = documentationURL[documentationURL.indexOf('metadata') + 1];
                                            }
                                            newCatalogURL = newCatalogURL.slice(0, idGeonetworkPath) + '/geonetwork/srv/fre/csw?request=GetRecordById&service=CSW&version=2.0.2&elementSetName=full&id=' + idCatalog;
                                        }
                                    }
                                    // Manage catalogURL
                                    if (newLayer.catalogURL) {
                                        // Update catalogues
                                        newLayer.extendedParams.annexeCatalogURL = newLayer.catalogURL;
                                        delete newLayer.catalogURL;
                                    }
                                    if (newCatalogURL) newLayer.catalogURL = newCatalogURL;
                                    // Add params to rejoin the data after
                                    newLayer.extendedParams.tjsJoinData = {
                                        url: tjsManagement.url,
                                        FrameworkURI: tjsManagement.FrameworkURI,
                                        DatasetURI: tjsManagement.datasets.selected.DatasetURI,
                                        attributes: tjsManagement.datasets.selected.attributes.list.map(l => l.name),
                                        filter: filter,
                                        style: style
                                    };
                                    newLayer.title = '[TJS] - ' + newLayer.title;
                                    // Generate id
                                    newLayer.id = newLayer.name + '_TJS' + groupTJS.nodes.length + 1;
                                    return Rx.Observable.from([
                                        addLayer(newLayer),
                                        moveNode(newLayer.id, groupTJS.id, groupTJS.nodes.length)
                                    ]);
                                } catch (e) {
                                    alert('Cannot parse the join result to create a new layer.\n' + e.message);
                                    return Rx.Observable.empty();
                                }
                            }
                            alert('Cannot parse JoinOutput - TJS join not done');
                            console.log(response)
                            return Rx.Observable.empty();
                        })
                        .catch(function(e) {
                            // Cannot Join data
                            alert(e);
                            console.log(e);
                            return Rx.Observable.empty();
                        })
                } catch (e) {
                    alert(e);
                    return Rx.Observable.empty();
                }
            } else {
                // No tjsManagement field founded
                return Rx.Observable.empty();
            }
        });
};

const prepareTJSOnMapLoaded = (action$, store) => {
    // on each CREATE_NEW_FEATURE action triggered
    return action$.ofType(MAP_CONFIG_LOADED)
        .switchMap((action) => {
            // First, tjsAllowed ?
            const state = store.getState();
            if (getCFG('verbose')) {
                console.group('| TJSPlugin | prepareTJSOnMapLoaded')
                console.log('init map state ->')
                console.log(cloneDeep(state));
                console.groupEnd()
            }
            // Update joinData on each layer which is joined
            var actions = [];
            layersSelector(state).forEach(function(layer) {
                // Check joinData available and update TJS Framework
                try {
                    if (layer.extendedParams && layer.extendedParams.tjsJoinData) {
                        // Execute the request
                        API.joinData(
                            layer.extendedParams.tjsJoinData.url,
                            layer.extendedParams.tjsJoinData.FrameworkURI,
                            layer.extendedParams.tjsJoinData.DatasetURI,
                            layer.extendedParams.tjsJoinData.attributes,
                            layer.extendedParams.tjsJoinData.filter,
                            layer.extendedParams.tjsJoinData.style
                        ).then((result) => {
                            if (getCFG('verbose')) {
                                console.group('prepareTJSOnMapLoaded - Promise result JoinData')
                                console.log(result)
                                console.groupEnd()
                            }
                        }).catch((error) => {
                            console.log('JoinData doesn t succeed')
                            console.log(error.message)
                        });
                    } else if (layer && layer.url && layer.type && ['wms', 'wfs'].indexOf(layer.type) > -1) {
                        actions.push(getTJSFramework(layer.id));
                    }
                } catch (e) {
                    console.log('Cannot update joinData of the layer ' + layer.name);
                    console.log(e)
                }
            });
            return Rx.Observable.from(actions);
        });
};

const onRemoveLayerFindParentSelected = (action$, store) => {
    // on each CREATE_NEW_FEATURE action triggered
    return action$.ofType(REMOVE_NODE)
        .switchMap((action) => {
            const layer2TJSSelected = get(store.getState(), "tjsExtension.layer2TJSSelected");
            // Check if parentSelected is the layer wanted to remove
            if (action.nodeType === "layers" && layer2TJSSelected && layer2TJSSelected.id && layer2TJSSelected.id === action.node) {
                return Rx.Observable.of(setLayer2TJS(null));
            }
            return Rx.Observable.empty();
        });
};

/* EXPORTS */
export default {
    onAddLayerFindTJSFramework,
    onGetTJSFramework,
    onGetTJSDatasets,
    onSelectLayerDisplayTJSButton,
    onSelectTJSDataset,
    onGetSLDLayer,
    onSelectSLDLayer,
    onSelectFilterValue,
    onSelectFilterColumn,
    joinDataTJS,
    prepareTJSOnMapLoaded,
    onRemoveLayerFindParentSelected
};
