import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: items, error } = await supabase.from('inventory').select('*');
  if (error) {
    console.error(error);
    return;
  }
  
  for (const item of items) {
    const unit = item.unit.toLowerCase();
    let oldQuantity = item.quantity;
    let newQuantity = oldQuantity;
    
    if (unit === 'docenas') {
      const units = Math.ceil(oldQuantity * 12);
      newQuantity = units / 12;
    } else if (unit === 'unidades') {
      newQuantity = Math.ceil(oldQuantity);
    }
    
    if (newQuantity !== oldQuantity) {
      console.log(`Updating ${item.name}: ${oldQuantity} -> ${newQuantity}`);
      await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', item.id);
    }
  }
  
  console.log('Inventory updated.');
  
  const { data: logs, error: lError } = await supabase.from('production_log').select('*, inventory(unit)');
  if (lError) return;
  for (const log of logs) {
      if (!log.inventory) continue;
      const unit = log.inventory.unit.toLowerCase();
      
      let q = log.quantity;
      let r = log.cantidad_restante;
      
      let newQ = q;
      let newR = r;
      
      if (unit === 'docenas') {
          if (q != null) newQ = Math.ceil(q * 12) / 12;
          if (r != null) newR = Math.ceil(r * 12) / 12;
      } else if (unit === 'unidades') {
          if (q != null) newQ = Math.ceil(q);
          if (r != null) newR = Math.ceil(r);
      }
      
      if (newQ !== q || newR !== r) {
          console.log(`Updating log ${log.id}: q ${q}->${newQ}, r ${r}->${newR}`);
          await supabase.from('production_log').update({ quantity: newQ, cantidad_restante: newR }).eq('id', log.id);
      }
  }
  console.log('Production log updated.');
}
run();
