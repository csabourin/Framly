import { type Project, type InsertProject } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  updateProject(id: string, project: InsertProject): Promise<Project | undefined>;
  listProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;

  constructor() {
    this.projects = new Map();
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async updateProject(id: string, insertProject: InsertProject): Promise<Project | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    
    const updated: Project = {
      ...existing,
      ...insertProject,
      updatedAt: new Date()
    };
    this.projects.set(id, updated);
    return updated;
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }
}

export const storage = new MemStorage();
