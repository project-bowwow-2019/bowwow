import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import fetch from 'isomorphic-fetch'
import BusinessSubtypeSelect from './BusinessSubtypeSelect';

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent:'center'
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 120,
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 2,
  },
});

function SelectSubtype(props){
  retun
}

class MainBusinessSelect extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      category:'',
      labelWidth:0,
      subtype:[],
      businessType:{}
    }
    this.selectBusiness = this.selectBusiness.bind(this)
  };

  componentDidMount() {
    this.setState({
      labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
    });
  }

  handleChange = name => async event => {
    this.setState({ [name]: event.target.value });
    this.setState({businessType:{}})
    const response = await fetch('http://localhost:5000/chatbotCreate/api/getBusinessSubtype?businessCategory='+ event.target.value)
    const body = await response.json()
    if (response.status !== 200) throw Error(body.message);
    this.setState({subtype:body});
  };

  selectBusiness(data){
    this.setState({businessType:data});
  }


  render(){
    const {classes}=this.props;

    return(
      <div className={classes.root}>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel ref={ref => {this.InputLabelRef = ref;}} htmlFor="outlined-age-native-simple">
            Category
          </InputLabel>
          <Select native value={this.state.category} onChange={this.handleChange('category')}
            input={
              <OutlinedInput name="category" labelWidth={this.state.labelWidth} id="outlined-age-native-simple"/>
            }>
            <option value="" />
            {this.props.category.map((item, index) => (
              <option key={index} value={item.category}>{item.category}</option>
            ))};
            </Select>
        </FormControl>
        <div>
          {this.state.subtype.length!=0 ?  (
            <BusinessSubtypeSelect category={this.state.category} subtype={this.state.subtype} selectBusiness = {this.selectBusiness}/>
          ): null}
        </div>
      </div>
    )
  }
}
export default withStyles(styles)(MainBusinessSelect);
