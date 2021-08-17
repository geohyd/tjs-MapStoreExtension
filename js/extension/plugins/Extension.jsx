/* eslint-disable */
/* REQUIREMENTS */
import React from 'react';
import { connect } from 'react-redux';
import { name } from '../../../config';
import PropTypes from 'prop-types';
import {get, find} from 'lodash';
import { setLayer2TJS, setDatasetSelected, selectSLD, selectFilterColumn, selectFilterValue, joinLayer, clickTjsBtn } from '../state/actions';
import tjsEpics from '../state/epics';
import tjsExtension from '../state/reducers';

import Dialog from 'mapstore2/web/client/components/misc/Dialog';
const {Glyphicon: GlyphiconRB, Button: ButtonRB, Checkbox} = require('react-bootstrap');
import tooltip from 'mapstore2/web/client/components/misc/enhancers/tooltip';
const Button = tooltip(ButtonRB);
const { DropdownList } = require('react-widgets');

import {createSelector} from 'reselect';
import {layersSelector} from 'mapstore2/web/client/selectors/layers';

import Message from "mapstore2/web/client/components/I18N/Message";

/* STYLE */
require('../assets/style.css');

/* SELECTORS */
const tjsSelector = createSelector(
    state => get(state, 'tjsExtension.style'),
    state => get(state, 'tjsExtension.layer2TJSSelected'),
    state => get(state, 'tjsExtension.datasetsModal'),
    layersSelector,
    (style, layer2TJSSelected, datasetsModal, layers) =>
        ({ style, layer2TJSSelected, datasetsModal, layers: layers.filter(l => l.extendedParams && l.extendedParams.tjsManagement)})
);

/* COMPONENT */
class TJSComponent extends React.Component {
    static propTypes = {
        verbose: PropTypes.bool,
        datasetsModal: PropTypes.bool,
        closeGlyph: PropTypes.string,
        onSelectLayer2TJS: PropTypes.func,
        onSelectDataset: PropTypes.func,
        onSelectSLD: PropTypes.func,
        onSelectFilterValue: PropTypes.func,
        onSelectFilterColumn: PropTypes.func,
        onClickJoinLayer: PropTypes.func,
        onClickClosemodal: PropTypes.func,
        style: PropTypes.object,
        layer2TJSSelected: PropTypes.object,
        removeJoinLayerProperties: PropTypes.array
    };

    static defaultProps = {
        verbose: false,
        style: {display: "none"},
        closeGlyph: "1-close",
        removeJoinLayerProperties: [],
        datasetsModal: false
    };

    state = {
        filterEnabled: false
    };

    render() {
        // Should have a render but it can be not displayed
        return (<div className="ms2">
                    {/* Configuration in hidded div to link state and extension configuration */}
                    <div id="tjsCFG" style={{display: "none"}}
                        removeJoinLayerProperties={this.props.removeJoinLayerProperties.toString()}
                        verbose={this.props.verbose.toString()} />
                    {/* TJS plugin IHM */}
                    {this.props.layer2TJSSelected ?
                        <div>
                            {/* TJS Dialog modal */}
                            <Dialog id="mapstore-tjs-extension" style={{display: this.props.datasetsModal ? "block" : "none"}} draggable={false} modal={false}>
                                <span role="header">
                                    <span className="about-panel-title"><Message msgId="tjsManager.titleModal" /></span>
                                    <button onClick={() => this.props.onClickClosemodal()} className="settings-panel-close close">{this.props.closeGlyph ? <GlyphiconRB glyph={this.props.closeGlyph}/> : <span>×</span>}</button>
                                </span>
                                {/* Body */}
                                <div role="body">
                                    <div style={{fontWeight: "bold"}}><Message msgId="tjsManager.datasetsList" /></div>
                                    {/* Display datasets list if everything is ok */}
                                    {this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets && this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.list ?
                                        <DropdownList
                                            placeholder={<Message msgId="tjsManager.datasetsSelection" />}
                                            value={
                                                this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected && find(this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets, {DatasetURI: this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.DatasetURI}).title
                                            }
                                            onChange={(dataset) => { this.props.onSelectDataset(this.props.layer2TJSSelected.id, dataset.DatasetURI) }}
                                            data={this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.list}
                                            textField="title"
                                            valueField="DatasetURI"
                                        /> : <p><Message msgId="tjsManager.datasetsNotFound" /></p>
                                    }
                                    {/* Display sld list if everything is ok */}
                                    {this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets && this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected &&
                                        <div>
                                            { this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes ?
                                                <div className="row">
                                                    <div className="col-xs-12">
                                                        <div style={{fontWeight: "bold"}}><Message msgId="tjsManager.sldList" /></div>
                                                        {this.props.layer2TJSSelected.extendedParams.tjsManagement.sld && this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.list ?
                                                            <DropdownList
                                                                placeholder={<Message msgId="tjsManager.sldSelection" />}
                                                                value={
                                                                    this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected && find(this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.list, {name: this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected.name}).title
                                                                }
                                                                onChange={(sld) => { this.props.onSelectSLD(this.props.layer2TJSSelected.id, sld.name) }}
                                                                data={this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.list}
                                                                textField="title"
                                                                valueField="name"
                                                            /> : <p>
                                                                {this.props.layer2TJSSelected.extendedParams.tjsManagement.sld && this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.loading ?
                                                                    <Message msgId="tjsManager.sldIsLoading" /> : <Message msgId="tjsManager.sldNotFound" />
                                                                }
                                                            </p>
                                                        }
                                                    </div>
                                                    <div className="col-xs-12">
                                                        <Checkbox
                                                            onChange={() => {
                                                                if (this.state.filterEnabled) this.props.onSelectFilterColumn(this.props.layer2TJSSelected.id, undefined)
                                                                this.setState({ filterEnabled: !this.state.filterEnabled })
                                                            }}
                                                            checked={this.state.filterEnabled}>
                                                            <Message msgId="tjsManager.filterEnabled" />
                                                        </Checkbox>
                                                    </div>
                                                </div> : <p><Message msgId="tjsManager.dataattributesNotFound" /></p>
                                            }
                                            {/* Display filter capacity */}
                                            { this.state.filterEnabled &&
                                                (
                                                    this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected &&
                                                    find(this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.list, {name: this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected.name})
                                                ) &&
                                                <div className="row">
                                                    <div className="col-xs-6">
                                                        <div style={{fontWeight: "bold"}}><Message msgId="tjsManager.filterColumnList" /></div>
                                                        <DropdownList
                                                            placeholder={<Message msgId="tjsManager.filterColumnSelection" />}
                                                            value={this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter && this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterColumn}
                                                            onChange={(filterColumnSelection) => { this.props.onSelectFilterColumn(this.props.layer2TJSSelected.id, filterColumnSelection.name) }}
                                                            data={this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.list}
                                                            textField="title"
                                                            valueField="name"
                                                        />
                                                    </div>
                                                    {this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter &&
                                                        this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterList &&
                                                        <div className="col-xs-6">
                                                            <div style={{fontWeight: "bold"}}><Message msgId="tjsManager.filterValueList" /></div>
                                                            <DropdownList
                                                                placeholder={<Message msgId="tjsManager.filterValueSelection" />}
                                                                value={this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterValue &&
                                                                    this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterList.indexOf(this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterValue) > -1 &&
                                                                    this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterValue}
                                                                onChange={(filterValueSelection) => { this.props.onSelectFilterValue(this.props.layer2TJSSelected.id, filterValueSelection) }}
                                                                data={this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterList}
                                                            />
                                                        </div>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    }
                                    {/* Render join button if everything is ok */}
                                    {(
                                        this.props.layer2TJSSelected.extendedParams.tjsManagement.sld &&
                                        this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected &&
                                        find(this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.list, {name: this.props.layer2TJSSelected.extendedParams.tjsManagement.sld.selected.name})
                                    ) &&
                                        this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets && this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes &&
                                        (
                                            !this.state.filterEnabled ||
                                            (
                                                this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter &&
                                                this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterColumn &&
                                                this.props.layer2TJSSelected.extendedParams.tjsManagement.datasets.selected.attributes.filter.filterValue
                                            )
                                        ) &&
                                        <div className="row joinData">
                                            <Button className={`btn btn-primary`}
                                                onClick={() => this.props.onClickJoinLayer(this.props.layer2TJSSelected.id)}
                                                tooltipId={<Message msgId="tjsManager.joinDataExecution" />}
                                                tooltipPosition="bottom">
                                                <Message msgId="tjsManager.joinDataExecution" />
                                            </Button>
                                        </div>
                                    }
                                </div>
                                <div role="footer">
                                    <p style={{fontStyle: "italic"}}>{this.props.layer2TJSSelected.title}</p>
                                </div>
                            </Dialog>
                        </div > : null}
                </div>);
    }
}

/* EXPORT PLUGIN */
export default {
    name,
    component: connect(tjsSelector,
        {
            onSelectLayer2TJS: setLayer2TJS,
            onSelectDataset: setDatasetSelected,
            onSelectSLD: selectSLD,
            onSelectFilterColumn: selectFilterColumn,
            onSelectFilterValue: selectFilterValue,
            onClickJoinLayer: joinLayer,
            onClickClosemodal: clickTjsBtn
        }
    )(TJSComponent),
    reducers: { tjsExtension },
    epics: tjsEpics,
    containers: {
        Toolbar: {
            name: "TJSExtension",
            position: 11,
            icon: <GlyphiconRB glyph="link" />,
            doNotHide: true,
            action: clickTjsBtn,
            selector: (state) => {
                return {
                    bsStyle: state.tjsExtension.datasetsModal ? "success" : "primary",
                    active: state.tjsExtension.datasetsModal,
                    disabled: state.tjsExtension.layer2TJSSelected ? false : true
                };
            },
            tooltip: "tjsManager.dataJoin",
            help: <Message msgId="tjsManager.dataJoin"/>,
            priority: 1
        }
    }
};
