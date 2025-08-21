import Swal from 'sweetalert2';
import '@sweetalert2/theme-dark/dark.css';

const MySwal = Swal.mixin({
  background: '#1d1d1dff', 
  color: '#ffffff',
  confirmButtonColor: '#5176e7ff', 
  cancelButtonColor: '#888',   

});

export default MySwal;