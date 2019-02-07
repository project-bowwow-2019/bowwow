import React from 'react';
import { Chat } from 'react-chat-popup';

class ChatWindow extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      mounted:0
    }
    this.mountChat = this.mountChat.bind(this);
  }

  componentDidMount(){
    this.setState({mounted:1});
  }

  handleNewUserMessage = (newMessage) => {
    console.log(`New message incomig! ${newMessage}`);
    // Now send the message throught the backend API
  }

  mountChat(mounted){
    if (mounted = 1){
      return <Chat
        handleNewUserMessage={this.handleNewUserMessage}
      />
    }
  }

  render() {
    return (
      <div className="App">
        {this.mountChat(this.state.mounted)}
      </div>
    );
  }
}

export default ChatWindow;
