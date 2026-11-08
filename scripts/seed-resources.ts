import { config as loadEnv } from "dotenv";
import { closeDb, getDb } from "../src/lib/db";
import { resourceCategories, resources } from "../src/lib/db/schema";
import type { ResourceCategory } from "../src/lib/resources";

loadEnv({ path: ".env.local" });

const VERIFIED_AT = new Date("2026-11-08T00:00:00.000Z");

const initialResources: Array<{
  key: string;
  title: string;
  description: string;
  url: string;
  sourceOrganization: string;
  categories: ResourceCategory[];
}> = [
  {
    key: "volunteer-canada-code-volunteer-involvement",
    title: "Canadian Code for Volunteer Involvement",
    description: "A guide and discussion framework for meaningful volunteer involvement across leadership, direct-service, and virtual roles, adaptable to organizations of different sizes.",
    url: "https://volunteer.ca/canadian-code-for-volunteer-involvement/",
    sourceOrganization: "Volunteer Canada",
    categories: ["Volunteer Management"],
  },
  {
    key: "capacity-canada-capacity-building-explained",
    title: "What is Capacity Building for Nonprofit Organizations?",
    description: "Explains nonprofit capacity building in plain language, with examples involving human resources, finance, fundraising, governance, and organizational assessment.",
    url: "https://capacitycanada.ca/what-is-capacity-building-for-nonprofit-organizations/",
    sourceOrganization: "Capacity Canada",
    categories: ["Other", "Strategic Planning"],
  },
  {
    key: "capacity-canada-fundraising-board-members",
    title: "Fundraising? “I Didn’t Sign Up for That.”",
    description: "Describes board members’ potential fundraising roles, including introductions, relationship-building, participating in asks, and donor stewardship.",
    url: "https://capacitycanada.ca/fundraising-i-didnt-sign-up-for-that/",
    sourceOrganization: "Capacity Canada",
    categories: ["Fundraising", "Governance & Leadership"],
  },
  {
    key: "capacity-canada-inclusive-board-culture",
    title: "Inclusive Board Culture",
    description: "A resource collection that helps boards reflect on bias and values, assess readiness for an inclusive culture, and consider practical next steps.",
    url: "https://capacitycanada.ca/inclusive-board-culture/",
    sourceOrganization: "Capacity Canada",
    categories: ["Governance & Leadership"],
  },
  {
    key: "capacity-canada-nfp-assessment-service",
    title: "NFP Organization Assessment Service",
    description: "A digitally delivered capacity-building assessment service with a survey, report, and debrief to help nonprofit leaders and boards understand needs and set priorities.",
    url: "https://capacitycanada.ca/nfp-assessment-capacity-planning/",
    sourceOrganization: "Capacity Canada",
    categories: ["Strategic Planning", "Governance & Leadership", "Financial Management", "HR", "Fundraising"],
  },
  {
    key: "greenmerits-technology-business-case-webinar",
    title: "How to build a case for your nonprofit to invest in technology",
    description: "A webinar on building a results-focused internal business case to explain the value of upfront and ongoing technology investment.",
    url: "https://nonprofitresources.ca/resource-library/how-to-build-a-case-for-your-nonprofit-to-invest-in-technology/",
    sourceOrganization: "GreenMerits Consulting Inc.",
    categories: ["Technology & Digital Transformation"],
  },
  {
    key: "greenmerits-technology-business-case-slides",
    title: "How to build a case for your nonprofit to invest in technology (webinar slide deck)",
    description: "Slide deck accompanying a webinar about creating an internal business case for a nonprofit technology purchase.",
    url: "https://nonprofitresources.ca/resource-library/how-to-build-a-case-for-your-nonprofit-to-invest-in-technology-webinar-slide-deck/",
    sourceOrganization: "GreenMerits Consulting Inc.",
    categories: ["Technology & Digital Transformation"],
  },
  {
    key: "onn-data-101-language-of-data",
    title: "Data 101: The Language of Data",
    description: "Introduces data fundamentals and how nonprofits use data as part of the Ontario Nonprofit Network’s Data, Evidence-use, and Learning initiative.",
    url: "https://nonprofitresources.ca/resource-library/data-101-the-language-of-data/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["Technology & Digital Transformation"],
  },
  {
    key: "onn-pre-budget-submission",
    title: "How to Write a Pre-budget Submission",
    description: "A presentation defining pre-budget submissions and outlining a step-by-step process for nonprofits to develop one.",
    url: "https://nonprofitresources.ca/resource-library/how-to-write-a-pre-budget-submission/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["Other"],
  },
  {
    key: "onn-board-essentials",
    title: "Reimagining Governance: Board Essentials",
    description: "Explains nonprofit board composition and directors’ responsibilities, duties, and liabilities in Ontario, while prompting reflection on governance practices.",
    url: "https://nonprofitresources.ca/resource-library/reimagining-governance-board-essentials/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["Governance & Leadership"],
  },
  {
    key: "onn-communicating-impact",
    title: "Six Simple Tips for Communicating about Impact",
    description: "Practical strategies to help nonprofits talk about why they evaluate their work, what they hope to learn, and their impact.",
    url: "https://nonprofitresources.ca/resource-library/six-simple-tips-for-communicating-about-impact/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["Marketing & Communications"],
  },
  {
    key: "onn-volunteers-decent-work",
    title: "Volunteers and Decent Work: What’s the Connection?",
    description: "Discusses how people are engaged by nonprofits and identifies practices and policies intended to protect volunteers.",
    url: "https://nonprofitresources.ca/resource-library/volunteers-and-decent-work-whats-the-connection/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["HR", "Volunteer Management"],
  },
  {
    key: "hub-nonprofit-risk-insurance",
    title: "Five Best Practices To Manage Nonprofit Risk And Insurance",
    description: "Outlines practical risk and insurance management practices for nonprofits with different risk landscapes and limited resources.",
    url: "https://nonprofitresources.ca/resource-library/five-best-practices-to-manage-nonprofit-risk-and-insurance/",
    sourceOrganization: "HUB International",
    categories: ["Financial Management"],
  },
  {
    key: "hub-digital-fundraising-risk",
    title: "Nonprofit Fundraising In The Digital Age: Risk Management Tips For A New Frontier",
    description: "Discusses risk-management considerations as nonprofits use digital media and online philanthropy to diversify revenue and reach audiences.",
    url: "https://nonprofitresources.ca/resource-library/nonprofit-fundraising-in-the-digital-age-risk-management-tips-for-a-new-frontier/",
    sourceOrganization: "HUB International",
    categories: ["Fundraising", "Technology & Digital Transformation"],
  },
  {
    key: "taylor-newberry-learning-impact-guide",
    title: "Achieving Greater Learning Impact by Starting with Learning: How-to Training Guide",
    description: "A how-to training guide accompanying a resource about enabling learning at the grant-application stage.",
    url: "https://nonprofitresources.ca/resource-library/achieving-greater-learning-impact-by-starting-with-learning-how-to-training-guide/",
    sourceOrganization: "Taylor Newberry Consulting",
    categories: ["Strategic Planning"],
  },
  {
    key: "onn-digging-in-reimagining-governance",
    title: "Digging In: Reimagining Governance",
    description: "A podcast episode about re-examining nonprofit governance and designing governance practices to fit an organization’s circumstances.",
    url: "https://nonprofitresources.ca/resource-library/digging-in-reimagining-governance/",
    sourceOrganization: "Ontario Nonprofit Network",
    categories: ["Governance & Leadership"],
  },
  {
    key: "volunteerconnector-anti-racist-volunteering",
    title: "An Anti-Racist Approach to Volunteering",
    description: "Discusses how volunteer organizations can address racism embedded in volunteering practices and structures so more people can participate.",
    url: "https://nonprofitresources.ca/resource-library/an-anti-racist-approach-to-volunteering/",
    sourceOrganization: "VolunteerConnector",
    categories: ["Volunteer Management"],
  },
];

async function seedResources() {
  const db = getDb();
  let insertedCount = 0;
  let existingCount = 0;
  await db.transaction(async (tx) => {
    for (const resource of initialResources) {
      const [inserted] = await tx.insert(resources).values({
        seedKey: resource.key,
        title: resource.title,
        description: resource.description,
        url: resource.url,
        sourceOrganization: resource.sourceOrganization,
        lastVerifiedAt: VERIFIED_AT,
      }).onConflictDoNothing({ target: resources.seedKey }).returning({ id: resources.id });
      if (!inserted) {
        existingCount += 1;
        continue;
      }
      await tx.insert(resourceCategories).values(resource.categories.map((category) => ({
        resourceId: inserted.id,
        category,
      })));
      insertedCount += 1;
    }
  });
  console.info(`Resource seed complete: ${insertedCount} added, ${existingCount} already present and left unchanged.`);
}

seedResources()
  .catch((error: unknown) => {
    console.error("Resource seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
