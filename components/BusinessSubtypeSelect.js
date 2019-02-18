import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import fetch from 'isomorphic-fetch'

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

class BusinessSubtypeSelect extends React.Component {
  constructor(props){
    super(props)
    this.state = {
      subtypeList:props.subtype,
      labelWidth:0,
      businessSubtype:''
    }
  };

  componentDidMount() {
    if(this.InputLabelRef != null){
      this.setState({
        labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
      });
    }
  }

  handleChange = name => async event => {
    await this.setState({ [name]: event.target.value });
    var business = {'category':this.props.category, 'subtype':this.state.businessSubtype}
    this.props.selectBusiness(business);
  };


  render(){
    const {classes}=this.props;

    console.log(this.props.subtype.length)
    return(
      <div className={classes.root}>
        <FormControl variant="outlined" className={classes.formControl}>
          <InputLabel ref={ref => {this.InputLabelRef = ref;}} htmlFor="outlined-age-native-simple">
            Subtype
          </InputLabel>
          <Select native value={this.state.businessSubtype} onChange={this.handleChange('businessSubtype')}
            input={
              <OutlinedInput name="Subtype" labelWidth={this.state.labelWidth} id="outlined-age-native-simple"/>
            }>
            <option value="" />
            {this.props.subtype.map((item, index) => (
              <option key={index} value={item.subtype}>{item.subtype}</option>
            ))};
        </Select>
        </FormControl>
      </div>
    )
  }
}
export default withStyles(styles)(BusinessSubtypeSelect);
