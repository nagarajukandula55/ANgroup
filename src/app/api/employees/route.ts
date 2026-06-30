/**
 * Employees API
 * GET /api/employees — list employees (from User model, STAFF role)
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')

    const query: any = { isDeleted: false }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const employees = await User.find(query)
      .select('-password')
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({ success: true, employees, total: employees.length })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
