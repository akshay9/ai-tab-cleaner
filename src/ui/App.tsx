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

interface userInputType {
  id: number,
  rawData: any,
  value: string,
  faviconUrl: string,
  selected: boolean
}

interface TabListState {
  userInput: string,
  list: Array<userInputType>
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

    this.exportData = this.exportData.bind(this)
  }

  componentDidMount() {
    browser.storage.local.get('cache')
    .then(storage => {
      const tabs = storage.cache
      let listItems = Object.keys(tabs).map(tabKey => {
        let tab = tabs[tabKey].tab
        if (!tab) return false
        return {
          id: tab.id,
          rawData: tabs[tabKey],
          value: tab.title || tabs[tabKey].title,
          faviconUrl: tab.favIconUrl,
          selected: false,
        }
      })

      this.setState({list: listItems})
    })
  }

  // Set a user input value
  updateInput(value){
    this.setState({
    userInput: value,
    });
  }

  // Add item if user input in not empty
  addItem(){
    if(this.state.userInput !== '' ){
    const userInput = {

      // Add a random id which is used to delete
      id : Math.random(),

      rawData: {},

      // Add a user value to list
      value : this.state.userInput,

      faviconUrl: "",

      // checkable
      selected: false,
    };

    // Update list
    const list = [...this.state.list];
    list.push(userInput);

    // reset state
    this.setState({
      list,
      userInput:""
    });
    }
  }

  //Select tab
  selectItem(key) {
    const list = [...this.state.list];
    list[key].selected = !list[key].selected

    // Update list in state
    this.setState({
    list:list,
    });
  }

  // Function to delete item from list use id to delete
  deleteItem(key){
    const list = [...this.state.list];

    // Filter values and leave value which we need to delete
    const updateList = list.filter(item => item.id !== key);

    // Update list in state
    this.setState({
    list:updateList,
    });

  }

  exportData() {
    let storageObj = this.state.list.map(tab => {
      let outArray = flattenObj(tab.rawData)
      outArray.close = tab.selected ? 1:0

      return outArray;
    })

    downloadObjectAsJson(storageObj, "data.json")

    
  }

  render(){
    return(<Container>

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
      <Col md={{ span: 5, offset: 4 }}>

      {/* <InputGroup className="mb-3">
      <FormControl
        placeholder="add item . . . "
        size="lg"
        value = {this.state.userInput}
        onChange = {item => this.updateInput(item.target.value)}
        aria-label="add something"
        aria-describedby="basic-addon2"
      />
      <InputGroup.Append>
        <Button
        variant="dark"
        size="lg"
        onClick = {()=>this.addItem()}
        >
        ADD
        </Button>
      </InputGroup.Append>
      </InputGroup> */}
      <InputGroup className="mb-3">
        <Button onClick={this.exportData} variant="success">Export</Button>
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
          <Stack direction="horizontal" gap={3}>
            <Image src={item.faviconUrl} rounded style={{width:25}} />
            {item.value}
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
