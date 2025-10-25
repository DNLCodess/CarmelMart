import { NextResponse } from "next/server";

/**
 * API Route: POST /api/vendor/verify-cac
 * Verifies Corporate Affairs Commission (CAC) registration via qoreId API
 */
export async function POST(request) {
  try {
    const { userId, rcNumber, companyName } = await request.json();

    // Validate required fields
    if (!userId || !rcNumber || !companyName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate RC number format (alphanumeric)
    if (!/^[A-Z0-9]+$/i.test(rcNumber)) {
      return NextResponse.json(
        { success: false, message: "Invalid RC number format" },
        { status: 400 }
      );
    }

    // Call qoreId API for CAC verification
    // Using CAC Premium for comprehensive business data
    const qoreIdResponse = await fetch(
      `https://api.qoreid.com/v1/ng/identities/cac-premium/${rcNumber}`,
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
      const cacData = qoreIdData.cac;

      // Verify company name matches (allow partial match)
      const companyNameMatch =
        cacData.companyName
          ?.toLowerCase()
          .includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(cacData.companyName?.toLowerCase());

      if (!companyNameMatch) {
        return NextResponse.json(
          {
            success: false,
            message: "Company name does not match CAC records",
          },
          { status: 400 }
        );
      }

      // Check if business is active
      if (cacData.status?.toUpperCase() !== "ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            message: "Business registration is not active",
          },
          { status: 400 }
        );
      }

      // Store CAC verification data in database
      const verificationRecord = await storeCACVerification({
        userId,
        rcNumber: cacData.rcNumber,
        companyName: cacData.companyName,
        companyType: cacData.companyType,
        registrationDate: cacData.registrationDate,
        branchAddress: cacData.branchAddress,
        headOfficeAddress: cacData.headOfficeAddress,
        city: cacData.city,
        state: cacData.state,
        companyEmail: cacData.companyEmail,
        affiliates: cacData.affiliates,
        shareCapital: cacData.shareCapital,
        status: cacData.status,
        verificationId: qoreIdData.id,
        verifiedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "CAC verified successfully",
        data: {
          verified: true,
          rcNumber: cacData.rcNumber,
          companyName: cacData.companyName,
          companyType: cacData.companyType,
          registrationDate: cacData.registrationDate,
          address: cacData.headOfficeAddress,
          city: cacData.city,
          state: cacData.state,
          status: cacData.status,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "CAC verification failed. Please check your RC number",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("CAC Verification Error:", error);
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
 * Store CAC verification data in database
 * Replace this with your actual database implementation
 */
async function storeCACVerification(data) {
  // Example using Supabase
  // const { data: record, error } = await supabase
  //   .from('cac_verifications')
  //   .insert([data])
  //   .select()
  //   .single();

  // if (error) throw error;
  // return record;

  // Example using Prisma
  // const record = await prisma.cacVerification.create({
  //   data: data,
  // });
  // return record;

  // For now, return mock data
  return { ...data, id: `cac_${Date.now()}` };
}
