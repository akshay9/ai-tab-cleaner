import * as React from 'react'
import { Button } from 'react-bootstrap'

interface TabItemType {
  id: number,
  name: string,
  faviconUrl: string,
  selected: boolean
}

class TabListItem extends React.Component {
  constructor(props:TabItemType){
    super(props)
  }

  render() {
    return (
      <Button variant="secondary" size="lg">
        Block level button
      </Button>
    )
  }
}

export default TabListItem;
