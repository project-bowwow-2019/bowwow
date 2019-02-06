import React from 'react';
import uuidv4 from 'uuid/v4';

class Conversation extends React.Component {
  // Conversation component is used to route all user conversation
  // Its state should include the user profile and if conversation is done
  // User profile contains relevancy list, qAskedID, attribute, currentQ, answer

  constructor (props) {
    super(props);
    this.state = {
      userID:"",
      sessionID:"",
      userUtterance: "",
      chatBotResponse:"hello!"
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  };

  async componentDidMount () {
    this.serverLivecheck()
      .then(res => this.setState({ response: res.status }))
      .catch(err => console.log(err));
    await this.hydrateStateWithLocalStorage();
    if (this.state.sessionID === ""){
      var id = await uuidv4();
      await this.setState({sessionID:id})
      localStorage.setItem("sessionID", id)
    }
  }

  async serverLivecheck () {
    const response = await fetch('/livecheck');
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit (event) {

  };

  hydrateStateWithLocalStorage() {
    // for all items in state
    for (let key in this.state) {
      // if the key exists in localStorage
      if (localStorage.hasOwnProperty(key)) {
        // get the key's value from localStorage
        let value = localStorage.getItem(key);
        console.log(value);
        // parse the localStorage string and setState
        try {
          value = JSON.parse(value);
          console.log(value);
          this.setState({ [key]: value });
        } catch (e) {
          // handle empty string
          this.setState({ [key]: value });
          console.log(value);
          console.log([key])
        }
      }
    }
  }

  handleChange (event) {
    this.setState({ userUtterance: event.target.value });
  }

  render () {
    return (
      <div>
        <div id='chatbot'>
          {this.state.chatBotResponse}
        </div>
        <div className='answer'>
          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Answer:</strong>
            </p>
            <input
              type='text'
              value={this.state.userUtterance}
              onChange={this.handleChange}
            />
          </form>
          <p> {this.state.sessionID}</p>
        </div>
      </div>
    );
  }
}
export default Conversation;
