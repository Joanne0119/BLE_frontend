import Swal from 'sweetalert2';
// import '@sweetalert2/theme-dark/dark.css';

const MySwal = Swal.mixin({
  background: '#ffffff',
  color: '#333333',
  confirmButtonColor: '#3085d6',
  cancelButtonColor: '#888',
});

export default MySwal;