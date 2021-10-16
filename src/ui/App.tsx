import * as React from 'react';
import * as browser from 'webextension-polyfill'

// Bootstrap for react
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Image from 'react-bootstrap/Image'
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl from 'react-bootstrap/FormControl';
import ListGroup from 'react-bootstrap/ListGroup';
import Stack from 'react-bootstrap/Stack';

//Libraries
import { flattenObj } from './helpers/flattenObj'
import downloadObjectAsJson from './helpers/downloadObjectAsJson'
import TabListItem from './components/TabListItem';
import TabMessageType from '../types/TabMessageType';


export interface TabListItemType {
  id: number,
  rawData: any,
  value: string,
  faviconUrl: string,
  selected: boolean
}

interface TabListState {
  userInput: string,
  list: Array<TabListItemType>
}

class App extends React.Component {
  state: TabListState

  constructor(props) {
    super(props);

    // Setting up state
    this.state = {
      userInput : "",
      list:[]
    }

    this.classifyTabs = this.classifyTabs.bind(this)
    this.trainTabs = this.trainTabs.bind(this)
    this.exportData = this.exportData.bind(this)
    this.resetData = this.resetData.bind(this)
  }

  componentDidMount() {
    browser.storage.local.get('liveTabs')
    .then(storage => {
      const tabs = storage.liveTabs
      let listItems = Object.keys(tabs).map(tabKey => {
        let tab = tabs[tabKey].tab
        if (!tab) return null
        return {
          id: tab.id,
          rawData: tabs[tabKey],
          value: tab.title || tabs[tabKey].title,
          faviconUrl: tab.favIconUrl,
          selected: false,
        } as TabListItemType
      })
      listItems.sort((a, b) => a.rawData.tab.index - b.rawData.tab.index)

      this.setState({list: listItems})
      this.classifyTabs(listItems)
    })
  }

  _identifyTabs

  //Select tab
  selectItem(key) {
    const list = [...this.state.list];
    list[key].selected = !list[key].selected

    // Update list in state
    this.setState({
    list:list,
    });
  }

  classifyTabs(tabsList) {
    chrome.runtime.sendMessage(
      {type: 'classifyTabs', data: tabsList} as TabMessageType, 
      (closeList) => {
        console.log(closeList, closeList.array, closeList.values, closeList.data)
        const tabList = this.state.list
        for (let i = 0; i < tabList.length; i++) {
          const tab = tabList[i];
          const close = closeList[i];
          tabList[i].selected = close > 0.4
        }

        this.setState({list: tabList})
        console.log(closeList)
      }
    )
  }

  trainTabs() {
    chrome.runtime.sendMessage(
      {type: 'trainTabs', data: this.state.list} as TabMessageType, 
      (response) => {
        console.log(response)
      }
    )
  }

  exportData() {
    let storageObj = this.state.list.map(tab => {
      let outArray = flattenObj(tab.rawData)
      outArray.close = tab.selected ? 1:0

      return outArray;
    })

    downloadObjectAsJson(storageObj, "data")    
  }

  resetData() {
    chrome.runtime.sendMessage(
      {type: 'resetTabs'} as TabMessageType,
      (response) => {
        console.log(response)
      }
    )
  }

  render(){
    return (
      <Container>
        <Row style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: '3rem',
          fontWeight: 'bolder',
          }}
          >AI Tab Cleaner
        </Row>

        <hr/>
        <Row>
          <Col md={{ span: 2, offset: 4 }}>
            <InputGroup className="mb-3">
              <Button onClick={this.trainTabs} variant="danger">Train Tabs</Button>
              <Button onClick={this.exportData} variant="success">Export</Button>
              <Button onClick={this.resetData} variant="warning">Reset</Button>
            </InputGroup>
          </Col>
        </Row>
        <Row>
          <Col md={{ span: 5, offset: 4 }}>
            <ListGroup>
            {/* map over and print items */}
            {this.state.list.map((item, index) => {return(

              <ListGroup.Item key={index} variant={item.selected ? "dark":"light"} action
              onClick = { () => this.selectItem(index) }>
                <Stack direction="horizontal" gap={3} style={{width:350}}>
                  <input type="checkbox" checked={item.selected} onChange={() => {}}/>
                  <Image src={item.faviconUrl} rounded style={{width:25}} />
                  <div className="tab-item">{item.value}</div>
                </Stack>
              </ListGroup.Item>

            )})}
            </ListGroup>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default App;
