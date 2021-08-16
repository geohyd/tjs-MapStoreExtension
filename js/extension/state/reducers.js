/* eslint-disable */
/* REQUIREMENTS */
const assign = require('object-assign');
import { LOADED_DATA, LOAD_ERROR, UPDATE_STYLE_MILLESIME_BTN, SET_PARENT_SELECTED } from './actions';

function geonetworkExtension(state = { }, action) {
    switch (action.type) {
        case LOADED_DATA:
            return assign({}, state, {
                text: action.payload
            });
        case LOAD_ERROR:
            return assign({}, state, {
                error: action.error
            });
        case UPDATE_STYLE_MILLESIME_BTN:
            return assign({}, state, {
                style: action.style
            });
        case SET_PARENT_SELECTED:
            return assign({}, state, {
                parentSelected: action.parentSelected
            });
        default:
            return state;
    }
}

/* REDUCERS CASE */
export default geonetworkExtension;
