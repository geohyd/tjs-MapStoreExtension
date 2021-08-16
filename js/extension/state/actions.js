/* ACTIONS NAMES */
export const LOAD_DATA = 'GEONETWORK:LOAD_DATA';
export const LOADED_DATA = 'GEONETWORK:LOADED_DATA';
export const LOAD_ERROR = 'GEONETWORK:LOAD_ERROR';
export const UPDATE_STYLE_MILLESIME_BTN = 'GEONETWORK:UPDATE_STYLE_MILLESIME_BTN';
export const GET_MILLESIME_LAYERS = 'GEONETWORK:GET_MILLESIME_LAYERS';
export const SET_MILLESIME_SELECTED = 'GEONETWORK:SET_MILLESIME_SELECTED';
export const SET_PARENT_SELECTED = 'GEONETWORK:SET_PARENT_SELECTED';

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

export const updateStyleMillesimeBtn = (style) => {
    return {
        type: UPDATE_STYLE_MILLESIME_BTN,
        style
    };
};

export const getMillesimeLayers = (id) => {
    return {
        type: GET_MILLESIME_LAYERS,
        id
    };
};

export const setMillesimeSelected = (parentId, millesimeId) => {
    return {
        type: SET_MILLESIME_SELECTED,
        parentMillesime: parentId,
        currentMillesime: millesimeId
    };
};

export const setParentSelected = (layer) => {
    return {
        type: SET_PARENT_SELECTED,
        parentSelected: layer
    };
};
