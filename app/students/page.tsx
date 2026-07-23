"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";

// TypeScript interface for the student data
interface Student {
  id: number;
  name: string;
  dob: string | null;
  contact: string | null;
  enrollment_date: string | null;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Server-side Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  // Function to fetch students from Noah's API
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://school-management-system-api-xs24.onrender.com/api/v1/students/?page=${currentPage}`,
        {
          headers: {
            'Authorization': 'Bearer mock_token_admin1',
            'Content-Type': 'application/json'
          }
        }
      );

      // Parse the JSON response
      const data = await response.json();

      // 1. If the API returns a direct array
      if (Array.isArray(data)) {
        setStudents(data);
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
      // 2. If it's wrapped in a 'results' key (Standard Django/Python format)
      else if (data && Array.isArray(data.results)) {
        setStudents(data.results);
        setHasMore(data.results.length === ITEMS_PER_PAGE);
      }
      // 3. If it's wrapped in an 'items' or 'data' key
      else if (data && (Array.isArray(data.items) || Array.isArray(data.data))) {
        const arrayData = data.items || data.data;
        setStudents(arrayData);
        setHasMore(arrayData.length === ITEMS_PER_PAGE);
      }
      // 4. If it returns an Error Object (e.g., Invalid Token)
      else {
        console.error("API returned an unexpected structure:", data);
        setStudents([]); // Safe fallback to prevent the .filter crash
        setHasMore(false);
      }

    } catch (error) {
      console.error("Error loading students:", error);
      setStudents([]); // Fallback on network error
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch data whenever the page number changes
  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  // Client-side search filtering on the currently loaded page
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.id?.toString().includes(searchQuery)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col space-y-6 bg-background text-foreground min-h-screen">

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage student profiles, contact info, and enrollments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchStudents}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Load Data
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students by name, ID or contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Table Container */}
      <div className="border border-border/60 rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/40">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">DOB</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Enrollment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No students found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{student.id}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{student.dob || '—'}</td>
                    <td className="px-4 py-3">{student.contact || '—'}</td>
                    <td className="px-4 py-3">{student.enrollment_date || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredStudents.length}</span> items on Page {currentPage}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="h-8 text-xs flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            <span className="text-xs font-medium px-2 py-1 rounded bg-muted">
              Page {currentPage}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!hasMore || isLoading}
              className="h-8 text-xs flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}