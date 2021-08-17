/* eslint-disable */
/* REQUIREMENTS */
const assign = require('object-assign');
import { LOADED_DATA, LOAD_ERROR, UPDATE_STYLE_BTN, SET_LAYER_2_TJS } from './actions';

/* REDUCERS CASE */
export default function(state = {}, action) {
    switch (action.type) {
        case LOADED_DATA:
            return assign({}, state, {
                text: action.payload
            });
        case LOAD_ERROR:
            return assign({}, state, {
                error: action.error
            });
        case UPDATE_STYLE_BTN:
            return assign({}, state, {
                style: action.style
            });
        case SET_LAYER_2_TJS:
            return assign({}, state, {
                layer2TJSSelected: action.layer2TJSSelected
            });
        default:
            return state;
    }
}
