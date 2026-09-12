/**
 * Tool Router & Tool Schema Registry for Success Mantra AI Agent
 * Validates tool requests, injects authenticated user identity, executes authorized tools,
 * and sanitizes all tool responses before returning to the model.
 */

const aiTools = require('./aiTools');
const { sanitizeToolOutput } = require('./aiSanitizer');

/**
 * OpenAI / Gemma 4 function schema definitions for NVIDIA NIM
 */
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'getStudentProfile',
      description: 'Get the authenticated student profile, target class, and academic goal.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getStudentEnrollments',
      description: 'Get all active class enrollments, courses, and memberships of the logged-in student.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAuthorizedClasses',
      description: 'Get list of academic classes and batches the student is authorized to access.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyCourses',
      description: 'Get list of authorized courses and progress for the student.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getCourseDetails',
      description: 'Get detailed syllabus, chapters, and curriculum of a course if authorized.',
      parameters: {
        type: 'object',
        properties: {
          courseId: { type: 'number', description: 'The numeric ID of the course.' }
        },
        required: ['courseId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyNotes',
      description: 'Get study notes, chapter PDFs, and R2 documents authorized for the student.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional keyword or subject to search for notes.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getNoteStatus',
      description: 'Diagnose note access, availability, and class authorization status for a specific note or PDF.',
      parameters: {
        type: 'object',
        properties: {
          noteId: { type: 'string', description: 'The ID of the note or PDF document.' }
        },
        required: ['noteId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyLiveClasses',
      description: 'Get all scheduled and ongoing live broadcast classes authorized for the student.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getLiveSessionStatus',
      description: 'Diagnose the current or nearest live broadcast session, checking class authorization and broadcast state.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Optional specific live class session ID.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkLiveKitConnection',
      description: 'Diagnose classroom connection readiness, permissions, and stream pipeline.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Optional specific live class ID.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyRecordings',
      description: 'Get authorized video recordings of past live broadcast lectures.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRecordingStatus',
      description: 'Check recording processing, publishing, and authorization status for a lecture video.',
      parameters: {
        type: 'object',
        properties: {
          recordingId: { type: 'number', description: 'The numeric ID of the recording.' }
        },
        required: ['recordingId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyAssignments',
      description: 'Get student assignments, due dates, marks, and submission statuses.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAssignmentStatus',
      description: 'Get details, feedback, and submission state of a specific assignment.',
      parameters: {
        type: 'object',
        properties: {
          assignmentId: { type: 'number', description: 'The numeric ID of the assignment.' }
        },
        required: ['assignmentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyTests',
      description: 'Get active online mock tests, test window dates, and recent attempt scores.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTestStatus',
      description: 'Diagnose test availability and student attempt status for a test.',
      parameters: {
        type: 'object',
        properties: {
          testId: { type: 'number', description: 'The numeric ID of the test.' }
        },
        required: ['testId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyAttendance',
      description: 'Get class attendance logs, present percentage, and subject-wise records.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Optional subject name filter (e.g. Accountancy).' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyPaymentStatus',
      description: 'Get student orders, payment status, and active membership validity.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createSupportTicket',
      description: 'Create and escalate an official support ticket for the student when an issue cannot be resolved automatically.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Issue category: LIVE_CLASS, NOTES, RECORDING, COURSE, ASSIGNMENT, TEST, ATTENDANCE, PAYMENT, ACCOUNT, TECHNICAL, or OTHER'
          },
          subject: { type: 'string', description: 'Concise summary of the problem.' },
          description: { type: 'string', description: 'Detailed diagnostic or problem summary.' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Ticket priority.' }
        },
        required: ['subject', 'category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMySupportTickets',
      description: 'Get the list of all support tickets created by the logged-in student.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyAnnouncements',
      description: 'Get latest academic announcements and batch notices.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyCommunity',
      description: 'Get class communities and doubt discussion groups the student belongs to.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getMyBooks',
      description: 'Get available books and publications from the Success Mantra bookstore authorized for student enrollment.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAdminOverview',
      description: 'ADMIN ONLY: Get high-level platform metrics including total students, faculty, courses, books, live classes, open support tickets, and completed orders.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAdminBookStats',
      description: 'ADMIN ONLY: Get comprehensive bookstore inventory stats, publication counts, draft counts, and low-stock alerts.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAdminRecentOrders',
      description: 'ADMIN ONLY: Get recent course and publication orders with customer names, amounts, and transaction statuses.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAdminSupportTickets',
      description: 'ADMIN ONLY: Get all student support tickets and escalation requests across the platform.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Optional status filter: Open, In Progress, Resolved, or Closed.' }
        }
      }
    }
  }
];

/**
 * Registry of allowlisted tool implementations
 */
const ALLOWLISTED_TOOLS = {
  getStudentProfile: aiTools.getStudentProfile,
  getStudentEnrollments: aiTools.getStudentEnrollments,
  getAuthorizedClasses: aiTools.getAuthorizedClasses,
  getMyCourses: aiTools.getMyCourses,
  getCourseDetails: aiTools.getCourseDetails,
  getMyNotes: aiTools.getMyNotes,
  getNoteStatus: aiTools.getNoteStatus,
  getMyBooks: aiTools.getMyBooks,
  getMyLiveClasses: aiTools.getMyLiveClasses,
  getLiveSessionStatus: aiTools.getLiveSessionStatus,
  checkLiveKitConnection: aiTools.checkLiveKitConnection,
  getMyRecordings: aiTools.getMyRecordings,
  getRecordingStatus: aiTools.getRecordingStatus,
  getMyAssignments: aiTools.getMyAssignments,
  getAssignmentStatus: aiTools.getAssignmentStatus,
  getMyTests: aiTools.getMyTests,
  getTestStatus: aiTools.getTestStatus,
  getMyAttendance: aiTools.getMyAttendance,
  getMyAnnouncements: aiTools.getMyAnnouncements,
  getMyCommunity: aiTools.getMyCommunity,
  getMyPaymentStatus: aiTools.getMyPaymentStatus,
  createSupportTicket: aiTools.createSupportTicket,
  getMySupportTickets: aiTools.getMySupportTickets,
  getAdminOverview: aiTools.getAdminOverview,
  getAdminBookStats: aiTools.getAdminBookStats,
  getAdminRecentOrders: aiTools.getAdminRecentOrders,
  getAdminSupportTickets: aiTools.getAdminSupportTickets
};

/**
 * Route and execute an AI requested tool safely
 */
async function executeToolCall({ toolName, rawArgs = {}, userId, userDetails }) {
  if (!userId) {
    return {
      error: 'Authentication failed. Missing user identity context.',
      authorized: false
    };
  }

  const toolFn = ALLOWLISTED_TOOLS[toolName];
  if (!toolFn || typeof toolFn !== 'function') {
    // Unknown or non-allowlisted tool: DENY strictly
    console.warn(`[AI Tool Router] Denied unapproved tool execution: ${toolName} by user ${userId}`);
    return {
      error: `The requested tool '${toolName}' is not permitted in the Success Mantra security allowlist.`,
      authorized: false
    };
  }

  // Parse args safely if string
  let parsedArgs = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (e) {
      parsedArgs = {};
    }
  }

  // ALWAYS bind authenticated userId from server session, never from LLM
  parsedArgs.userId = userId;
  parsedArgs.userDetails = userDetails;

  const startTime = Date.now();
  try {
    const rawResult = await toolFn(parsedArgs);
    const duration = Date.now() - startTime;

    // Sanitize before returning
    const safeResult = sanitizeToolOutput(rawResult);

    // Safe security logging (no secrets or sensitive payloads)
    console.log(`[AI Tool Router] Executed ${toolName} for user ${userId} in ${duration}ms (status: success)`);

    return safeResult;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[AI Tool Router] Error in tool ${toolName} for user ${userId} (${duration}ms):`, err.message);
    return {
      error: `Failed to execute ${toolName}. Please try again or create a support ticket.`,
      details: err.message
    };
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  ALLOWLISTED_TOOLS,
  executeToolCall
};
