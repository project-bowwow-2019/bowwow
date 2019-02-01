import React from 'react';

class Conversation extends React.Component {
  // Conversation component is used to route all user conversation
  // Its state should include the user profile and if conversation is done
  // User profile contains relevancy list, qAskedID, attribute, currentQ, answer

  constructor (props) {
    super(props);
    this.state = {
      user: {
        sessionID: "",
      },
      userUtterance: "",
      chatBotResponse:""
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  };

  componentDidMount () {
    this.callApi()
      .then(res => this.setState({ response: res.status }))
      .catch(err => console.log(err));
    if (Object.keys(this.props.userMainProfile).length !== 0) {
      this.setState({ userProfile: this.props.userMainProfile });
    }
  }

  async callApi () {
    const response = await fetch('/livecheck');
    const body = await response.json();
    if (response.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit (event) {
    console.log('in conversation handlesubmit');
    event.preventDefault();
    fetch('/conversation/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.state.userProfile)
    })
      .then(res => res.json())
      .then(data => {
        var userProfile1 = data;
        userProfile1.answer = "";
        this.props.triggerParentHandler(userProfile1);
        this.setState({ userProfile: userProfile1 });

        fetch('/v1/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.state.userProfile)
        })
          .then(res => {
            if (res.status !== 200) throw Error(res.error);
            return res.json();
          })
          .then(data => {
            console.log(data);
            this.setState({ bookResult: data.likeGenreResult });
            if (this.state.userProfile.relevancy.reduce((a,b)=> a+b,0) <= 0) {
              this.setState({ isDone: true });
            };
          });
      });
  };

  handleChange (event) {
    var userProfile1 = this.state.userProfile;
    userProfile1.answer = event.target.value;
    this.setState({ userProfile: userProfile1 });
  }

  render () {
    return (
      <div>
        <Nav route={this.props.route} />
        <div id='question'>
          {this.state.userProfile.currentQ.question}
        </div>
        <div className='Answer'>
          <form onSubmit={this.handleSubmit}>
            <p>
              <strong>Answer:</strong>
            </p>
            <input
              type='text'
              value={this.state.userProfile.answer}
              onChange={this.handleChange}
            />
          </form>
          <p>{JSON.stringify(this.state.userProfile)}</p>
          <p>Suggested Books:</p>
          {this.state.bookResult.map((item, index) => (
            <p id={index}>{item}</p>
          ))}
        </div>
      </div>
    );
  }
}
export default Conversation;
