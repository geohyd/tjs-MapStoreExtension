/* ACTIONS NAMES */
export const LOAD_DATA = 'TJS:LOAD_DATA';
export const LOADED_DATA = 'TJS:LOADED_DATA';
export const LOAD_ERROR = 'TJS:LOAD_ERROR';
export const UPDATE_STYLE_BTN = 'TJS:UPDATE_STYLE_TJS_BTN';
export const GET_TJS_FRAMEWORK = 'TJS:GET_TJS_FRAMEWORK';
export const GET_TJS_DATASETS = 'TJS:GET_TJS_DATASETS';
export const SET_DATASET_SELECTED = 'TJS:SET_DATASET_SELECTED';
export const SET_LAYER_2_TJS = 'TJS:SET_LAYER_2_TJS';
export const GET_SLD_LAYER = 'TJS:GET_SLD_LAYER';
export const SET_SLD_SELECTED = 'TJS:SET_SLD_SELECTED';
export const SET_FILTER_VALUE = 'TJS:SET_FILTER_VALUE';
export const JOIN_LAYER_TJS = 'TJS:JOIN_LAYER_TJS';
export const MANAGE_DATE_ATTRIBUTES = 'TJS:MANAGE_DATE_ATTRIBUTES';
export const SET_FILTER_COLUMN = 'TJS:SET_FILTER_COLUMN';
export const CLICK_TJS_BUTTON = 'TJS:CLICK_TJS_BUTTON';

/* ACTIONS FUNCTIONS */

export const loadData = () => {
    return {
        type: LOAD_DATA
    };
};

export const loadedData = (payload) => {
    return {
        type: LOADED_DATA,
        payload
    };
};

export const loadError = (error) => {
    return {
        type: LOAD_ERROR,
        error
    };
};

export const updateStyleTjsBtn = (style) => {
    return {
        type: UPDATE_STYLE_BTN,
        style
    };
};

export const clickTjsBtn = () => {
    return {
        type: CLICK_TJS_BUTTON
    };
};

export const getTJSFramework = (id) => {
    return {
        type: GET_TJS_FRAMEWORK,
        id
    };
};

export const getTJSDatasets = (id) => {
    return {
        type: GET_TJS_DATASETS,
        id
    };
};

export const setDatasetSelected = (layerId, datasetURI) => {
    return {
        type: SET_DATASET_SELECTED,
        layerId: layerId,
        datasetURI: datasetURI
    };
};

export const selectSLD = (layerId, sldName) => {
    return {
        type: SET_SLD_SELECTED,
        layerId: layerId,
        sldName: sldName
    };
};

export const selectFilterValue = (layerId, filterValue) => {
    return {
        type: SET_FILTER_VALUE,
        layerId: layerId,
        filterValue: filterValue
    };
};

export const selectFilterColumn = (layerId, filterColumn) => {
    return {
        type: SET_FILTER_COLUMN,
        layerId: layerId,
        filterColumn: filterColumn
    };
};

export const setLayer2TJS = (layer) => {
    return {
        type: SET_LAYER_2_TJS,
        layer2TJSSelected: layer
    };
};

export const getSLDLayer = (id) => {
    return {
        type: GET_SLD_LAYER,
        id
    };
};

export const joinLayer = (id) => {
    return {
        type: JOIN_LAYER_TJS,
        id
    };
};
