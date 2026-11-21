import { redirect } from 'next/navigation';

// "Nueva farmacia" ahora es un modal en /farmacias (?nueva=1 lo abre).
// Se mantiene la ruta para enlaces antiguos.
export default function NuevaFarmaciaPage() {
  redirect('/farmacias?nueva=1');
}
