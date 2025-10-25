import { NextResponse } from "next/server";

/**
 * API Route: POST /api/vendor/verify-nin
 * Verifies National Identity Number (NIN) via qoreId API
 */
export async function POST(request) {
  try {
    const { userId, ninNumber, firstName, lastName } = await request.json();

    // Validate required fields
    if (!userId || !ninNumber || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate NIN format (11 digits)
    if (!/^\d{11}$/.test(ninNumber)) {
      return NextResponse.json(
        { success: false, message: "Invalid NIN format. Must be 11 digits" },
        { status: 400 }
      );
    }

    // Call qoreId API for NIN verification
    const qoreIdResponse = await fetch(
      `https://api.qoreid.com/v1/ng/identities/nin-premium/${ninNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.QOREID_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const qoreIdData = await qoreIdResponse.json();

    // Check if verification was successful
    if (qoreIdData.status?.status === "verified") {
      const ninData = qoreIdData.nin;

      // Verify name matches
      const firstNameMatch = ninData.firstname
        ?.toLowerCase()
        .includes(firstName.toLowerCase());
      const lastNameMatch = ninData.lastname
        ?.toLowerCase()
        .includes(lastName.toLowerCase());

      if (!firstNameMatch || !lastNameMatch) {
        return NextResponse.json(
          {
            success: false,
            message: "Name does not match NIN records",
          },
          { status: 400 }
        );
      }

      // Store NIN verification data in database
      // Replace this with your actual database call
      const verificationRecord = await storeNINVerification({
        userId,
        ninNumber,
        firstName: ninData.firstname,
        lastName: ninData.lastname,
        dateOfBirth: ninData.birthdate,
        phoneNumber: ninData.phone,
        verificationId: qoreIdData.id,
        verifiedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "NIN verified successfully",
        data: {
          verified: true,
          firstName: ninData.firstname,
          lastName: ninData.lastname,
          phoneNumber: ninData.phone,
          dateOfBirth: ninData.birthdate,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "NIN verification failed. Please check your details",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("NIN Verification Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred during verification",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Store NIN verification data in database
 * Replace this with your actual database implementation
 */
async function storeNINVerification(data) {
  // Example using Supabase
  // const { data: record, error } = await supabase
  //   .from('nin_verifications')
  //   .insert([data])
  //   .select()
  //   .single();

  // if (error) throw error;
  // return record;

  // Example using Prisma
  // const record = await prisma.ninVerification.create({
  //   data: data,
  // });
  // return record;

  // For now, return mock data
  return { ...data, id: `nin_${Date.now()}` };
}
