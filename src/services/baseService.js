import { supabase } from "@/lib/supabase";

export class BaseService {
  constructor(tableName) {
    this.table = tableName;
  }

  async list(orderBy = "created_at", limit = 100) {
    let ascending = true;
    let column = orderBy;
    
    // Handle "-field" syntax for descending sort
    if (orderBy && orderBy.startsWith("-")) {
        ascending = false;
        column = orderBy.substring(1);
    }
    
    const { data, error } = await supabase
      .from(this.table)
      .select("*")
      .order(column, { ascending })
      .limit(limit);
      
    if (error) throw error;
    return data;
  }

  async create(recordData) {
    // Remove ID if present (let DB handle execution)
    const { id, ...payload } = recordData;
    
    const { data, error } = await supabase
      .from(this.table)
      .insert(payload)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  async update(id, updates) {
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  async delete(id) {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
  
  async getById(id) {
      const { data, error } = await supabase
        .from(this.table)
        .select("*")
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
  }
  
  // Custom filter method
  async filter(filters, orderBy = "created_at", limit = 100) {
      let query = supabase.from(this.table).select("*");
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
      });
      
      let ascending = true;
      let column = orderBy;
      if (orderBy && orderBy.startsWith("-")) {
        ascending = false;
        column = orderBy.substring(1);
      }
      
      if (column) {
         query = query.order(column, { ascending });
      }
      
      if (limit) {
          query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
  }
}
