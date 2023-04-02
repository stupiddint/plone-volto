/**
 * Add container.
 * @module components/manage/Add/Add
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { BodyClass, Helmet } from '@plone/volto/helpers';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { keys, isEmpty } from 'lodash';
import { defineMessages, injectIntl } from 'react-intl';
import { Button, Grid, Menu } from 'semantic-ui-react';
import { Portal } from 'react-portal';
import { v4 as uuid } from 'uuid';
import qs from 'query-string';
import { toast } from 'react-toastify';

import { createContent, getSchema, changeLanguage } from '@plone/volto/actions';
import {
  Form,
  Icon,
  Toolbar,
  Sidebar,
  Toast,
  TranslationObject,
} from '@plone/volto/components';
import {
  getBaseUrl,
  hasBlocksData,
  flattenToAppURL,
  getBlocksFieldname,
  getBlocksLayoutFieldname,
  getLanguageIndependentFields,
  langmap,
  normalizeLanguageName,
} from '@plone/volto/helpers';

import { preloadLazyLibs } from '@plone/volto/helpers/Loadable';

import config from '@plone/volto/registry';

import saveSVG from '@plone/volto/icons/save.svg';
import clearSVG from '@plone/volto/icons/clear.svg';

const messages = defineMessages({
  add: {
    id: 'Add {type}',
    defaultMessage: 'Add {type}',
  },
  save: {
    id: 'Save',
    defaultMessage: 'Save',
  },
  cancel: {
    id: 'Cancel',
    defaultMessage: 'Cancel',
  },
  error: {
    id: 'Error',
    defaultMessage: 'Error',
  },
  translateTo: {
    id: 'Translate to {lang}',
    defaultMessage: 'Translate to {lang}',
  },
});

/**
 * Add class.
 * @class Add
 * @extends Component
 */
let initialBlocks;
let initialBlocksLayout;

const Add = (props) => {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(null);
  const [formSelected, setFormSelected] = useState('addForm');
  /**
   * Property types.
   * @property {Object} propTypes Property types.
   * @static
   */
  Add.propTypes = {
    createContent: PropTypes.func.isRequired,
    getSchema: PropTypes.func.isRequired,
    pathname: PropTypes.string.isRequired,
    schema: PropTypes.objectOf(PropTypes.any),
    content: PropTypes.shape({
      // eslint-disable-line react/no-unused-prop-types
      '@id': PropTypes.string,
      '@type': PropTypes.string,
    }),
    returnUrl: PropTypes.string,
    createRequest: PropTypes.shape({
      loading: PropTypes.bool,
      loaded: PropTypes.bool,
    }).isRequired,
    schemaRequest: PropTypes.shape({
      loading: PropTypes.bool,
      loaded: PropTypes.bool,
    }).isRequired,
    type: PropTypes.string,
    location: PropTypes.objectOf(PropTypes.any),
  };

  /**
   * Default properties
   * @property {Object} defaultProps Default properties.
   * @static
   */
  Add.defaultProps = {
    schema: null,
    content: null,
    returnUrl: null,
    type: 'Default',
  };

  /**
   * Constructor
   * @method constructor
   * @param {Object} props Component properties
   * @constructs WysiwygEditor
   */

  useEffect(() => {
    if (config.blocks?.initialBlocks[props.type]) {
      initialBlocksLayout = config.blocks.initialBlocks[
        props.type
      ].map((item) => uuid());
      initialBlocks = initialBlocksLayout.reduce(
        (acc, value, index) => ({
          ...acc,
          [value]: { '@type': config.blocks.initialBlocks[props.type][index] },
        }),
        {},
      );
    }
    getSchema(props.type, getBaseUrl(props.pathname));
    setIsClient(true);
  }, []);
  // };

  /**
   * Component did mount
   * @method componentDidMount
   * @returns {undefined}
   */
  useEffect(() => {
    props.getSchema(props.type, getBaseUrl(props.pathname));
    setIsClient(true);
  }, []);

  /**
   * Component will receive props
   * @method componentWillReceiveProps
   * @param {Object} nextProps Next properties
   * @returns {undefined}
   */
  useEffect((nextProps) => {
    if (
      props.createRequest.loading &&
      nextProps.createRequest.loaded &&
      nextProps.content['@type'] === props.type
    ) {
      props.history.push(
        props.returnUrl || flattenToAppURL(nextProps.content['@id']),
      );
    }

    if (props.createRequest.loading && nextProps.createRequest.error) {
      const message =
        nextProps.createRequest.error.response?.body?.message ||
        nextProps.createRequest.error.response?.text;

      const error =
        new DOMParser().parseFromString(message, 'text/html')?.all[0]
          ?.textContent || message;

      setError(error);

      toast.error(
        <Toast
          error
          title={props.intl.formatMessage(messages.error)}
          content={`${nextProps.createRequest.error.status}:  ${error}`}
        />,
      );
    }
  }, []);

  /**
   * Submit handler
   * @method onSubmit
   * @param {object} data Form data.
   * @returns {undefined}
   */
  function onSubmit(data) {
    props.createContent(getBaseUrl(props.pathname), {
      ...data,
      '@static_behaviors': props.schema.definitions
        ? keys(props.schema.definitions)
        : null,
      '@type': props.type,
      ...(config.settings.isMultilingual &&
        props.location?.state?.translationOf && {
          translation_of: props.location.state.translationOf,
          language: props.location.state.language,
        }),
    });
  }

  /**
   * Cancel handler
   * @method onCancel
   * @returns {undefined}
   */
  function onCancel() {
    if (props.location?.state?.translationOf) {
      const language = props.location.state.languageFrom;
      const langFileName = normalizeLanguageName(language);
      import('@root/../locales/' + langFileName + '.json').then((locale) => {
        props.changeLanguage(language, locale.default);
      });
      props.history.push(props.location?.state?.translationOf);
    } else {
      props.history.push(getBaseUrl(props.pathname));
    }
  }

  const form = useRef();

  /**
   * Render method.
   * @method render
   * @returns {string} Markup for the component.
   */

  if (props.schemaRequest.loaded) {
    const visual = hasBlocksData(props.schema.properties);
    const blocksFieldname = getBlocksFieldname(props.schema.properties);
    const blocksLayoutFieldname = getBlocksLayoutFieldname(
      props.schema.properties,
    );
    const translationObject = props.location?.state?.translationObject;

    const translateTo = translationObject
      ? langmap?.[props.location?.state?.language]?.nativeName
      : null;

    // Lookup initialBlocks and initialBlocksLayout within schema
    const schemaBlocks = props.schema.properties[blocksFieldname]?.default;
    const schemaBlocksLayout =
      props.schema.properties[blocksLayoutFieldname]?.default?.items;

    if (!isEmpty(schemaBlocksLayout) && !isEmpty(schemaBlocks)) {
      // setInitialBlocks({});
      // setInitialBlocksLayout([]);
      initialBlocks = {};
      initialBlocksLayout = [];
      schemaBlocksLayout.forEach((value) => {
        if (!isEmpty(schemaBlocks[value])) {
          let newUid = uuid();
          initialBlocksLayout.push(newUid);
          initialBlocks[newUid] = schemaBlocks[value];
          initialBlocks[newUid].block = newUid;

          // Layout ID - keep a reference to the original block id within layout
          initialBlocks[newUid]['@layout'] = value;
        }
      });
    }

    //copy blocks from translationObject
    if (translationObject && blocksFieldname && blocksLayoutFieldname) {
      // setInitialBlocks({});
      // setInitialBlocksLayout([]);
      initialBlocks = {};
      initialBlocksLayout = [];
      const originalBlocks = JSON.parse(
        JSON.stringify(translationObject[blocksFieldname]),
      );
      const originalBlocksLayout =
        translationObject[blocksLayoutFieldname].items;

      originalBlocksLayout.forEach((value) => {
        if (!isEmpty(originalBlocks[value])) {
          let newUid = uuid();
          initialBlocksLayout.push(newUid);
          initialBlocks[newUid] = originalBlocks[value];
          initialBlocks[newUid].block = newUid;

          // Layout ID - keep a reference to the original block id within layout
          initialBlocks[newUid]['@canonical'] = value;
        }
      });
    }

    const lifData = () => {
      const data = {};
      if (translationObject) {
        getLanguageIndependentFields(props.schema).forEach(
          (lif) => (data[lif] = translationObject[lif]),
        );
      }
      return data;
    };

    const pageAdd = (
      <div id="page-add">
        <Helmet
          title={props.intl.formatMessage(messages.add, {
            type: props.type,
          })}
        />
        <Form
          ref={form}
          key="translated-or-new-content-form"
          schema={props.schema}
          type={props.type}
          formData={{
            ...(blocksFieldname && {
              [blocksFieldname]:
                initialBlocks ||
                props.schema.properties[blocksFieldname]?.default,
            }),
            ...(blocksLayoutFieldname && {
              [blocksLayoutFieldname]: {
                items:
                  initialBlocksLayout ||
                  props.schema.properties[blocksLayoutFieldname]?.default
                    ?.items,
              },
            }),
            // Copy the Language Independent Fields values from the to-be translated content
            // into the default values of the translated content Add form.
            ...lifData(),
          }}
          requestError={error}
          onSubmit={onSubmit}
          hideActions
          pathname={props.pathname}
          visual={visual}
          title={
            props?.schema?.title
              ? props.intl.formatMessage(messages.add, {
                  type: props.schema.title,
                })
              : null
          }
          loading={props.createRequest.loading}
          isFormSelected={formSelected === 'addForm'}
          onSelectForm={() => {
            setFormSelected('addForm');
          }}
        />
        {isClient && (
          <Portal node={document.getElementById('toolbar')}>
            <Toolbar
              pathname={props.pathname}
              hideDefaultViewButtons
              inner={
                <>
                  <Button
                    id="toolbar-save"
                    className="save"
                    aria-label={props.intl.formatMessage(messages.save)}
                    onClick={() => form.current.onSubmit()}
                    loading={props.createRequest.loading}
                  >
                    <Icon
                      name={saveSVG}
                      className="circled"
                      size="30px"
                      title={props.intl.formatMessage(messages.save)}
                    />
                  </Button>
                  <Button className="cancel" onClick={() => onCancel()}>
                    <Icon
                      name={clearSVG}
                      className="circled"
                      aria-label={props.intl.formatMessage(messages.cancel)}
                      size="30px"
                      title={props.intl.formatMessage(messages.cancel)}
                    />
                  </Button>
                </>
              }
            />
          </Portal>
        )}
        {visual && isClient && (
          <Portal node={document.getElementById('sidebar')}>
            <Sidebar />
          </Portal>
        )}
      </div>
    );
    // functional component return
    return translationObject ? (
      <>
        <BodyClass className="babel-view" />
        <Grid
          celled="internally"
          stackable
          columns={2}
          id="page-add-translation"
        >
          <Grid.Column className="source-object">
            <TranslationObject
              translationObject={translationObject}
              schema={props.schema}
              pathname={props.pathname}
              visual={visual}
              isFormSelected={setFormSelected('translationObjectForm')}
              onSelectForm={() => {
                setState({
                  formSelected: 'translationObjectForm',
                });
              }}
            />
          </Grid.Column>
          <Grid.Column>
            <div className="new-translation">
              <Menu pointing secondary attached tabular>
                <Menu.Item name={translateTo.toUpperCase()} active={true}>
                  {`${props.intl.formatMessage(messages.translateTo, {
                    lang: translateTo,
                  })}`}
                </Menu.Item>
              </Menu>
              {pageAdd}
            </div>
          </Grid.Column>
        </Grid>
      </>
    ) : (
      pageAdd
    );
  }

  return <div />;
};
export default compose(
  injectIntl,
  connect(
    (state, props) => ({
      createRequest: state.content.create,
      schemaRequest: state.schema,
      content: state.content.data,
      schema: state.schema.schema,
      pathname: props.location.pathname,
      returnUrl: qs.parse(props.location.search).return_url,
      type: qs.parse(props.location.search).type,
    }),
    { createContent, getSchema, changeLanguage },
  ),
  preloadLazyLibs('cms'),
)(Add);
