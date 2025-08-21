import type { CustomClass, InsertCustomClass, Category, InsertCategory } from '@shared/schema';

const API_BASE = '/api';

// Custom Classes API
export const customClassesAPI = {
  async create(data: InsertCustomClass): Promise<CustomClass> {
    const response = await fetch(`${API_BASE}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create custom class: ${response.statusText}`);
    }
    return response.json();
  },

  async list(): Promise<CustomClass[]> {
    const response = await fetch(`${API_BASE}/classes`);
    if (!response.ok) {
      throw new Error(`Failed to fetch custom classes: ${response.statusText}`);
    }
    return response.json();
  },

  async get(name: string): Promise<CustomClass> {
    const response = await fetch(`${API_BASE}/classes/${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch custom class: ${response.statusText}`);
    }
    return response.json();
  },

  async update(name: string, data: InsertCustomClass): Promise<CustomClass> {
    const response = await fetch(`${API_BASE}/classes/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update custom class: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(name: string): Promise<void> {
    const response = await fetch(`${API_BASE}/classes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete custom class: ${response.statusText}`);
    }
  },
};

// Categories API
export const categoriesAPI = {
  async create(data: InsertCategory): Promise<Category> {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }
    return response.json();
  },

  async list(type?: string): Promise<Category[]> {
    const url = type 
      ? `${API_BASE}/categories?type=${encodeURIComponent(type)}`
      : `${API_BASE}/categories`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    return response.json();
  },

  async get(id: string): Promise<Category> {
    const response = await fetch(`${API_BASE}/categories/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch category: ${response.statusText}`);
    }
    return response.json();
  },

  async update(id: string, data: InsertCategory): Promise<Category> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update category: ${response.statusText}`);
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete category: ${response.statusText}`);
    }
  },
};